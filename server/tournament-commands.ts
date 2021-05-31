import {
  TournamentAdapter,
  MatchAdapter,
  MatchInterfaces,
  ParticipantInterfaces,
  ParticipantAdapter,
} from "challonge-ts";
import { TournamentModel } from "./models/Tournament";
import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
import { BetModel } from "./models/Bet";
import { createDummyEntries } from "./entries";

export const CHALLONGE_API_KEY = process.env.AT_CHALLONGE_KEY;
export const MINIMUM_NUMBER_OF_PARTICIPANTS = 8;
export const MAXIMUM_NUMBER_OF_PARTICIPANTS = 24;

export interface MatchMessage {
  first: PlayerMessageMeta;
  second: PlayerMessageMeta;
  matchId: number;
}

export interface PlayerMessageMeta {
  id: string;
  name: string;
  character: string;
  temporary?: boolean;
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
  }: { winnerId: number; winnerName: string; isWinnerFirstPlayer: boolean }
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
    name: winnerName,
  });
  if (entry?.userId) {
    await givePointsToUser(entry.userId, 5);
  }
  const bets = await BetModel.find({
    matchId,
    tournamentId,
    player: isWinnerFirstPlayer ? 1 : 2,
  });

  console.log("found bets", bets);

  await Promise.all(
    bets.map(async ({ userId, bet }) => {
      await givePointsToUser(userId, bet * 2);
    })
  );
};
export const getNextTournament = async (): Promise<{
  id: string;
  url: string;
  isPending: boolean;
} | null> => {
  console.log("Getting the current tournament");
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
      isPending: false,
    };
  } else {
    return {
      id: found.tournament.id.toString(),
      url: found.tournament.url,
      isPending: found.tournament.state === 'pending',
    };
  }
};

const findCompleteMatchMetaFromMatch = async (
  match: MatchInterfaces.matchResponseObject,
  participants: ParticipantInterfaces.participantResponseObject[]
) => {
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
      id: `${match.player1_id}`,
      character: firstParticipant?.character || "???",
      name: firstParticipant?.name || "Winner of the current match",
    },
    second: {
      id: `${match.player2_id}`,
      character: secondParticipant?.character || "???",
      name: secondParticipant?.name || "Winner of the current match",
    },
  };
};

export const getNextTournamentMatch = async (
  tournamentId: string
): Promise<MatchMessage | null> => {
  console.log("Getting the next tournament match");
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
    (p) =>
      (p as any).participant as ParticipantInterfaces.participantResponseObject
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
    (p) =>
      (p as any).participant as ParticipantInterfaces.participantResponseObject
  );
  const openMatches = matches.filter((match) => match.state == "open");

  // Not started yet
  if (openMatches[0] && openMatches[0].scores_csv != `0-0`) {
    return findCompleteMatchMetaFromMatch(openMatches[0], participants);
  }

  if (openMatches[1]) {
    return findCompleteMatchMetaFromMatch(openMatches[1], participants);
  }

  const pendingMatches = matches.find((match) => match.state == "pending");

  if (pendingMatches) {
    return findCompleteMatchMetaFromMatch(pendingMatches, participants);
  }

  return null;
};

export const getBetsForMatch = async (
  tournamentId: string,
  matchId: number
): Promise<{ player1: number; player2: number }> => {
  const bets = await BetModel.find({
    matchId,
    tournamentId,
  });
  const [p1, p2] = bets.reduce(
    (all, { player, bet }) => {
      all[player - 1] += bet;
      return all;
    },
    [0, 0]
  );
  return {
    player1: p1,
    player2: p2,
  };
};

export const officiallyStartMatch = async (
  tournamentId: string,
  matchId: number
) => {
  console.log("Starting a match!");
  await MatchAdapter.update(CHALLONGE_API_KEY, tournamentId, matchId, {
    match: {
      scores_csv: "0-0",
    },
  });
};
export const createNewTournament = async () => {
  console.log(`Creating a new tournament`);
  const count = await TournamentModel.countDocuments();
  const created = await TournamentAdapter.create(CHALLONGE_API_KEY, {
    tournament: {
      name: `Ultimate CPU Tournament #${count}`,
      description:
        "An automated tournament, see https://www.twitch.tv/autotournaments",
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
  console.log(`Adding participants for ${tournamentId}`);
  const currentParticipants = await TournamentAdapter.show(
    CHALLONGE_API_KEY,
    tournamentId
  );
  const currentNumberOfParticipants =
    currentParticipants.tournament.participants_count;
  const numberOfEmptySpots = getEvenNumber(
    MAXIMUM_NUMBER_OF_PARTICIPANTS - currentNumberOfParticipants
  );

  const playersToAdd = await EntryModel.find({
    tournamentId: null,
  }).limit(numberOfEmptySpots);

  const numberExistingPlusNewParticipants =
    playersToAdd.length + currentNumberOfParticipants;

  let playersToCreate = 0;
  if (numberExistingPlusNewParticipants < MINIMUM_NUMBER_OF_PARTICIPANTS) {
    playersToCreate = MINIMUM_NUMBER_OF_PARTICIPANTS - playersToAdd.length;
  } else if (numberExistingPlusNewParticipants % 2) {
    playersToCreate = 1;
  }

  if (playersToCreate > 0) {
    const created = await createDummyEntries(playersToCreate);
    playersToAdd.push(...created);
  }

  await ParticipantAdapter.bulkAdd(CHALLONGE_API_KEY, tournamentId, {
    participants: playersToAdd.map((p) => ({
      name: `${p.name} - ${p.id}`,
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
  console.log(`Starting tournament ${tournamentId}`);
  await ParticipantAdapter.randomize(CHALLONGE_API_KEY, tournamentId);
  await TournamentAdapter.start(CHALLONGE_API_KEY, tournamentId);
};
export const finishTournament = async (tournamentId: string) => {
  console.log(`Finishing tournament ${tournamentId}`);
  await TournamentAdapter.finalize(CHALLONGE_API_KEY, tournamentId);
  await TournamentModel.updateOne(
    {
      tournamentId,
    },
    {
      inProgress: false,
    }
  );
  await givePointsToWinner(tournamentId);
};
export const givePointsToUser = async (twitchId: string, points: number) => {
  await UserModel.updateOne(
    {
      twitchId,
    },
    {
      $inc: {
        points,
      },
    }
  );
  console.log(`Gave ${points} to ${twitchId}`);
};
export const givePointsToWinner = async (tournamentId: string) => {
  try {
    const participants = await ParticipantAdapter.index(
      CHALLONGE_API_KEY,
      tournamentId
    );
    const winner = participants.participants.find(
      (participant) => participant.final_rank === 1
    );
    const entry = await EntryModel.findById(winner.misc);
    if (entry) {
      if (entry.userId) {
        await TournamentModel.updateOne(
          {
            tournamentId,
          },
          {
            winnerId: entry.userId,
          }
        );
        const totalPoints = 50;
        await givePointsToUser(entry.userId, totalPoints);
      } else {
        console.error("TOURNAMENT RESULT: A bot won, too bad.");
      }
    } else {
      console.error("TOURNAMENT RESULT: no matching entry?!");
    }
  } catch (error) {
    console.error("TOURNAMENT RESULT: meh, didn't work", error);
  }
};
