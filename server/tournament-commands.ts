import {
  TournamentAdapter,
  MatchAdapter,
  MatchInterfaces,
  ParticipantInterfaces,
  ParticipantAdapter,
  TournamentInterfaces
} from "challonge-ts";
import { TournamentModel } from "./models/Tournament";
import { EntryModel } from "./models/Entry";
import { randomCharacter } from "./constants";
import { UserModel } from "./models/User";

export const CHALLONGE_API_KEY = process.env.AT_CHALLONGE_KEY;
export const MINIMUM_NUMBER_OF_PARTICIPANTS = 8;
export const MAXIMUM_NUMBER_OF_PARTICIPANTS = 24;

export interface MatchMessage {
  first: PlayerMessageMeta;
  second: PlayerMessageMeta;
  matchId: number;
}

export interface PlayerMessageMeta {
  id: number;
  name: string;
  character: string;
}

if (!CHALLONGE_API_KEY) {
  throw new Error("Challonge API Key not provided.");
}

export const getEvenNumber = (n: number) => Math.floor(n / 2) * 2;

export const finishMatch = async (
  tournamentId: string,
  matchId: number,
  {
    winnerId,
    winnerName,
    isWinnerFirstPlayer,
  }: { winnerId: number; winnerName: string, isWinnerFirstPlayer: boolean; }
) => {
  console.log(`Finishing match ${tournamentId}/${matchId}: ${winnerId}`);
  await MatchAdapter.update(CHALLONGE_API_KEY, tournamentId, matchId, {
    match: {
      winner_id: winnerId,
      scores_csv: isWinnerFirstPlayer ? `1-0` : `0-1`,
    },
  });
  const entry = await EntryModel.findOne({
    tournamentId: tournamentId,
    name: winnerName
  });
  if (entry.userId) {
    await UserModel.updateOne({
      twitchId: entry.userId,
    }, {
      $inc: {
        points: 5
      }
    })
  }
};
export const getNextTournament = async () => {
  const tournament = await TournamentModel.findOne({
    inProgress: true,
  });
  if (!tournament) {
    return null;
  }
  const found = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournament.tournamentId
  );
  if (!found.tournament) {
    console.log("Fallbacking on the tournament from db.", found);
    // This is just a fallback, no idea why this fails sometimes.
    return {
      id: tournament.tournamentId,
      url: tournament.tournamentId,
      state: 'in_progress',
    };
  } else {
    return {
      id: found.tournament.id.toString(),
      url: found.tournament.url,
      state: found.tournament.state,
    };
  }
};

const findCompleteMatchMetaFromMatch = async (match: MatchInterfaces.matchResponseObject, participants: ParticipantInterfaces.participantResponseObject[]) => {
  const matchId = match.id;
  const findParticipant = async (id) => {
    const participant = participants.find(
      (participant) => participant.id === id
    );
    return !!participant ? await EntryModel.findById(participant.misc) : null;
  };

  const firstParticipant = await findParticipant(match.player1_id);
  const secondParticipant = await findParticipant(match.player2_id);

  return {
    matchId,
    first: {
      id: match.player1_id,
      character: firstParticipant?.character || "???",
      name: firstParticipant?.name || "???",
    },
    second: {
      id: match.player2_id,
      character: secondParticipant?.character || "???",
      name: secondParticipant?.name || "???",
    },
  };
}

export const getNextTournamentMatch = async (
  tournamentId: string
): Promise<MatchMessage | null> => {
  const tournament = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournamentId,
    {
      include_matches: 1,
      include_participants: 1,
    }
  );

  // Fix for the wrong type in the lib.
  const matches = tournament.tournament.matches.map(
    (match) => (match as any).match as MatchInterfaces.matchResponseObject
  );
  const participants = tournament.tournament.participants.map(
    (p) => (p as any).participant as ParticipantInterfaces.participantResponseObject
  );
  const firstOpenMatch = matches.find((match) => match.state == "open");

  if (!firstOpenMatch) {
    return null;
  }

  return findCompleteMatchMetaFromMatch(firstOpenMatch, participants);
};
export const getUpcomingTournamentMatch = async (
  tournamentId: string
): Promise<MatchMessage | null> => {
  const tournament = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournamentId,
    {
      include_matches: 1,
      include_participants: 1,
    }
  );

  // Fix for the wrong type in the lib.
  const matches = tournament.tournament.matches.map(
    (match) => (match as any).match as MatchInterfaces.matchResponseObject
  );
  const participants = tournament.tournament.participants.map(
    (p) => (p as any).participant as ParticipantInterfaces.participantResponseObject
  );
  const openMatches = matches.filter((match) => match.state == "open");

  if (openMatches[1]) {
    return findCompleteMatchMetaFromMatch(openMatches[1], participants);
  }

  const pendingMatches = matches.find((match) => match.state == "pending");

  if (pendingMatches) {
    return findCompleteMatchMetaFromMatch(pendingMatches, participants);
  }

  return null;
};

export const officiallyStartMatch = async (tournamentId: string, matchId: number) => {
  console.log("Starting a match!");
  await MatchAdapter.update(CHALLONGE_API_KEY, tournamentId, matchId, {
    match: {
      scores_csv: '0-0'
    }
  });
}
export const createNewTournament = async () => {
  console.log(`Creating a new tournament`)
  const count = await TournamentModel.countDocuments();
  const created = await TournamentAdapter.create(CHALLONGE_API_KEY, {
    tournament: {
      name: `Ultimate CPU Tournament #${count}`,
      description: "An automated tournament, see https://www.twitch.tv/autotournaments",
      url: `ultimatecputournament_test${count}`,
    },
  });
  const tournamentId = created.tournament.id.toString();

  const newOne = new TournamentModel();
  newOne.tournamentId = tournamentId;
  newOne.inProgress = true;
  await newOne.save();
  return tournamentId;
};
export const addParticipants = async (tournamentId: string) => {
  console.log(`Adding participants for ${tournamentId}`)
  const currentParticipants = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournamentId
  );
  const currentNumberOfParticipants = currentParticipants.tournament.participants_count;
  const numberOfEmptySpots = getEvenNumber(MAXIMUM_NUMBER_OF_PARTICIPANTS - currentNumberOfParticipants);

  const playersToAdd = await EntryModel.find({
    tournamentId: null,
  }).limit(numberOfEmptySpots);

  const numberExistingPlusNewParticipants = playersToAdd.length + currentNumberOfParticipants;

  let playersToCreate = 0;
  if (numberExistingPlusNewParticipants <
    MINIMUM_NUMBER_OF_PARTICIPANTS) {
    playersToCreate = MINIMUM_NUMBER_OF_PARTICIPANTS - playersToAdd.length;
  } else if (numberExistingPlusNewParticipants % 2) {
    playersToCreate = 1;
  }

  if (playersToCreate > 0) {
    const createDummyEntry = () => {
      const entry = new EntryModel();
      const character = randomCharacter();
      entry.name = `No one's ${character}`;
      entry.character = character;
      return entry;
    };
    console.log(`About to create ${playersToCreate} dummies.`);
    const toCreate = [...new Array(playersToCreate)].map(createDummyEntry);
    const created = await EntryModel.insertMany(toCreate);
    playersToAdd.push(...created);
  }

  await ParticipantAdapter.bulkAdd(CHALLONGE_API_KEY, tournamentId, {
    participants: playersToAdd.map((p) => ({
      name: `${p.name}${p.bet ? ` (${p.bet} points)` : ''} - ${p.id}`,
      misc: p.id,
    })),
  });

  await EntryModel.updateMany(
    {
      _id: {
        $in: playersToAdd.map((p) => p.id),
      },
    },
    {
      tournamentId,
    }
  );
};
export const startTournament = async (tournamentId: string) => {
  console.log(`Starting tournament ${tournamentId}`)
  await ParticipantAdapter.randomize(CHALLONGE_API_KEY, tournamentId);
  await TournamentAdapter.start(CHALLONGE_API_KEY, tournamentId);
};
export const finishTournament = async (tournamentId: string) => {
  console.log(`Finishing tournament ${tournamentId}`)
  await TournamentAdapter.finalize(CHALLONGE_API_KEY, tournamentId);
  await TournamentModel.updateOne(
    {
      tournamentId,
    },
    {
      inProgress: false,
    }
  );
};
export const givePointsToWinner = async (tournamentId: string) => {
  try {
    const participants = await ParticipantAdapter.index(CHALLONGE_API_KEY, tournamentId);
    const winner = participants.participants.find(participant => participant.final_rank === 1);
    const entry = await EntryModel.findById(winner.misc);
    if (entry) {
      if (entry.userId) {
        const allTournamentEntries = await EntryModel.find({
          tournamentId,
        });
        const totalPoints = allTournamentEntries.reduce((total, t) => total + (t.bet || 0), 0);
        await UserModel.updateOne({
          twitchId: entry.userId,
        }, {
          $inc: {
            points: totalPoints
          }
        });
        console.log(`Gave ${totalPoints} to ${entry.userId}`);
      } else {
        console.error("A bot won, too bad.");
      }
    } else {
      console.error("no matching entry?!");
    }
  } catch (error) {
    console.error("meh, didn't work", error);
  }
};
