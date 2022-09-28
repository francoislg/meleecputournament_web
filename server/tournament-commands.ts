import {
  TournamentAdapter,
  MatchAdapter,
  MatchInterfaces,
  ParticipantInterfaces,
  ParticipantAdapter,
} from "challonge-ts";
import { TournamentModel } from "./models/Tournament";
import { EntryModel, IEntryModel } from "./models/Entry";
import { BetModel } from "./models/Bet";
import { createDummyEntries } from "./entries";
import { Award, givePointsToUser } from "./singlematches-commands";
import { importantLog } from "./log";
import { tryParseNumber } from "./parsing";
import { POINTS } from "./constants";

export const CHALLONGE_API_KEY = process.env.AT_CHALLONGE_KEY;
export const MINIMUM_NUMBER_OF_PARTICIPANTS = 8;
export const MAXIMUM_NUMBER_OF_PARTICIPANTS = 16;

export interface MatchMessage {
  first: PlayerMessageMeta;
  second: PlayerMessageMeta;
  matchId: number;
  isCustomMatch: boolean;
}

export interface PlayerMessageMeta {
  id: string;
  name: string;
  character: string;
  color?: number;
  temporary?: boolean;
}

if (!CHALLONGE_API_KEY) {
  throw new Error("Challonge API Key not provided.");
}

export const getEvenNumber = (n: number) => Math.floor(n / 2) * 2;

export const getPossibleEntries = () => {
  return EntryModel.aggregate<IEntryModel>([
    {
      $match: { tournamentId: null },
    },
    {
      $group: {
        _id: "$userId",
        // Here should implement all the IEntryModel properties
        tournamentId: { $first: "$tournamentId" },
        id: { $first: "$_id" },
        color: { $first: "$color" },
        userId: { $first: "$userId" },
        name: { $first: "$name" },
        character: { $first: "$character" },
      },
    },
  ]);
};

export const finishMatch = async (
  tournamentId: string,
  matchId: number,
  {
    winnerId,
    isWinnerFirstPlayer,
  }: { winnerId: number; isWinnerFirstPlayer: boolean }
) => {
  console.log(`Finishing match ${tournamentId}/${matchId}: ${winnerId}`);
  const match = await MatchAdapter.update(
    CHALLONGE_API_KEY,
    tournamentId,
    matchId,
    {
      match: {
        winner_id: winnerId,
        scores_csv: isWinnerFirstPlayer ? `1-0` : `0-1`,
      },
    }
  );

  let awards: Award[] = [];

  try {
    const badlyTypedParticipants = await ParticipantAdapter.index(
      CHALLONGE_API_KEY,
      tournamentId
    );
    const participants = badlyTypedParticipants.participants.map(
      (p) => (p as any).participant as typeof p
    );
    const findParticipant = async (id: number) => {
      const participant = participants.find(
        (participant) => participant.id === id
      );
      return !!participant ? await EntryModel.findById(participant.misc) : null;
    };
    console.log("PARTICIPANTS", participants);
    const winner = await findParticipant(
      isWinnerFirstPlayer ? match.match.player1_id : match.match.player2_id
    );
    console.log("WINNER", winner);
    if (winner?.userId) {
      const award = await givePointsToUser(winner.userId, 5);
      if (award) {
        awards.push(award);
      }
    }
  } catch (err) {
    importantLog("Error while awarding the entry's user", err.toString());
    console.error("Error while awarding the entry's user", err);
  }

  console.log("Getting to bets");
  try {
    const bets = await BetModel.find({
      matchId,
      tournamentId,
      player: isWinnerFirstPlayer ? 1 : 2,
    });

    console.log("found bets", bets);

    const wins = await Promise.all(
      bets.map(async ({ userId, bet }) => givePointsToUser(userId, bet * 2))
    );
    awards.push(...(wins.filter((a) => a !== null) as Award[]));
  } catch (error) {
    importantLog("Error while awarding bets", error.toString());
    console.error("Error while awarding bets", error);
  }

  return awards;
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
      isPending: found.tournament.state === "pending",
    };
  }
};

const findCompleteMatchMetaFromMatch = async (
  match: MatchInterfaces.matchResponseObject,
  participants: ParticipantInterfaces.participantResponseObject[]
): Promise<MatchMessage> => {
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
    isCustomMatch: false,
    first: {
      id: `${match.player1_id}`,
      character: firstParticipant?.character || "???",
      name: firstParticipant?.name || "Winner of the current match",
      color: tryParseNumber(firstParticipant?.color),
    },
    second: {
      id: `${match.player2_id}`,
      character: secondParticipant?.character || "???",
      name: secondParticipant?.name || "Winner of the current match",
      color: tryParseNumber(secondParticipant?.color),
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
        "An automated tournament, see https://www.twitch.tv/supersmashbotsshowdown",
      url: `ultimatecputournament_${count}`,
    },
  });
  const tournamentId = created.tournament.id.toString();
  const name = created.tournament.name;
  const url = created.tournament.url.toString();

  const newOne = new TournamentModel();
  newOne.tournamentId = tournamentId;
  newOne.inProgress = true;
  await newOne.save();
  return {
    tournamentId,
    name,
    url,
  };
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

  const playersToAdd = (
    await getPossibleEntries().limit(numberOfEmptySpots)
  ).filter((entry) => !!entry.userId);

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
  return await givePointsToWinner(tournamentId);
};

export const givePointsToWinner = async (tournamentId: string) => {
  const awards = [];
  try {
    const badlyTypedParticipants = await ParticipantAdapter.index(
      CHALLONGE_API_KEY,
      tournamentId
    );
    const participants = badlyTypedParticipants.participants.map(
      (p) => (p as any).participant as typeof p
    );
    const winner = participants.find(
      (participant) => participant.final_rank === 1
    );
    const entry = await EntryModel.findById(winner.misc);
    if (entry) {
      if (entry.userId) {
        console.log(
          `TOURNAMENT RESULT: Setting ${entry.userId} as the tournament winner`
        );
        await TournamentModel.findOneAndUpdate(
          {
            tournamentId,
          },
          {
            winnerId: entry.userId,
          }
        );
        const totalPoints = POINTS.TOURNAMENT_WIN;
        awards.push(await givePointsToUser(entry.userId, totalPoints));
      } else {
        console.error("TOURNAMENT RESULT: A bot won, too bad.");
      }
    } else {
      console.error("TOURNAMENT RESULT: no matching entry?!");
    }
  } catch (error) {
    console.error("TOURNAMENT RESULT: meh, didn't work", error);
  }
  return awards;
};
