import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
import { BetModel } from "./models/Bet";
import { ISingleMatchModel, SingleMatchModel } from "./models/SingleMatch";
import { createDummyEntries } from "./entries";
import { getBetsForMatch, MatchMessage } from "./tournament-commands";

// BE CAREFUL, with `.aggregate`, the entries do not have the `id` property.
const twoNextEntries = () =>
  EntryModel.aggregate([
    {
      $addFields: {
        isDummy: { $cond: [{ $not: ["$userId"] }, 2, 1] },
      },
    },
  ])
    .match({
      tournamentId: null,
    })
    .sort({
      isDummy: 1,
      createdAt: 1,
    })
    .limit(2);

export const FAKE_TOURNAMENT_ID = "singlematches";

const NUMBER_OF_ENTRIES_FOR_TOURNAMENT = 8;

export const hasEnoughEntriesForTournament = async () => {
  const entries = await EntryModel.find({
    tournamentId: null,
  }).limit(NUMBER_OF_ENTRIES_FOR_TOURNAMENT);

  return entries.length === NUMBER_OF_ENTRIES_FOR_TOURNAMENT;
};

export const hasSingleMatchInProgress = async () => {
  const match = await SingleMatchModel.findOne({
    winner: 0,
  });

  return match !== null;
};

type Award = {
  points: number;
  userId: string;
  userName: string;
};

export const finishSingleMatch = async (
  matchId: number,
  {
    winnerId,
    winnerName,
    isWinnerFirstPlayer,
  }: { winnerId: number; winnerName: string; isWinnerFirstPlayer: boolean }
) => {
  console.log(`Finishing match ${FAKE_TOURNAMENT_ID}/${matchId}: ${winnerId}`);
  const entry = await EntryModel.findOne({
    tournamentId: FAKE_TOURNAMENT_ID,
    name: winnerName,
  });

  let awards: Award[] = [];

  if (entry?.userId) {
    const award = await givePointsToUser(entry.userId, 5);
    if (award) {
      awards.push(award);
    }
  }
  const bets = await BetModel.find({
    matchId,
    tournamentId: FAKE_TOURNAMENT_ID,
    player: isWinnerFirstPlayer ? 1 : 2,
  });

  console.log("found bets", bets);

  const wins = await Promise.all(
    bets.map(async ({ userId, bet }) => givePointsToUser(userId, bet * 2))
  );
  awards.push(...(wins.filter((a) => a !== null) as Award[]));

  await SingleMatchModel.findOneAndUpdate(
    {
      matchId,
    },
    {
      winner: isWinnerFirstPlayer ? 1 : 2,
    }
  );

  return awards;
};

const findCompleteMatchMetaFromMatch = async (
  match: ISingleMatchModel
): Promise<MatchMessage> => {
  const findParticipant = async (id) => {
    return !!id ? await EntryModel.findById(id) : null;
  };

  const firstParticipant = await findParticipant(match.player1Id);
  const secondParticipant = await findParticipant(match.player2Id);

  return {
    matchId: match.matchId,
    first: {
      id: match.player1Id,
      character: firstParticipant?.character || "???",
      name: firstParticipant?.name || "???",
    },
    second: {
      id: match.player2Id,
      character: secondParticipant?.character || "???",
      name: secondParticipant?.name || "???",
    },
  };
};

export const getNextSingleMatch = async (): Promise<MatchMessage | null> => {
  console.log("Getting the next single match");

  const match = await SingleMatchModel.findOne({
    winner: 0,
  });

  if (!match) {
    return null;
  }

  return findCompleteMatchMetaFromMatch(match);
};

export const getUpcomingSingleMatch =
  async (): Promise<MatchMessage | null> => {
    console.log("Getting upcoming single match");

    const match = await SingleMatchModel.findOne({
      started: false,
      winner: 0,
    });

    if (match) {
      console.log("Found existing upcoming match");
      return findCompleteMatchMetaFromMatch(match);
    }

    const entries = await twoNextEntries();

    if (entries.length < 2) {
      const created = await createDummyEntries(2 - entries.length);
      entries.push(...created);
    }

    const {
      _id: id = 0,
      character = "???",
      name = "The next entry or a dummy",
    } = entries[0] || {};
    const {
      _id: secondId = 0,
      character: secondCharacter = "???",
      name: secondName = "The next entry or a dummy",
    } = entries[1] || {};

    const count = await SingleMatchModel.countDocuments();

    return {
      matchId: count,
      first: {
        id,
        character,
        name,
      },
      second: {
        id: secondId,
        character: secondCharacter,
        name: secondName,
      },
    };
  };

export const getBetsForSingleMatch = async (
  matchId: number
): Promise<{ player1: number; player2: number }> => {
  return getBetsForMatch(FAKE_TOURNAMENT_ID, matchId);
};

export const officiallyStartSingleMatch = async (matchId: number) => {
  console.log("Starting a single match!");
  await SingleMatchModel.findOneAndUpdate(
    {
      matchId,
    },
    {
      started: true,
    }
  );
};
export const createSingleMatch = async (): Promise<MatchMessage> => {
  console.log(`Creating a single match`);

  const playersToAdd = await twoNextEntries();

  if (playersToAdd.length < 2) {
    const created = await createDummyEntries(2 - playersToAdd.length);
    playersToAdd.push(...created);
  }

  const count = await SingleMatchModel.countDocuments();
  const match = new SingleMatchModel();
  match.matchId = count;
  match.started = false;
  match.player1Id = playersToAdd[0].id || playersToAdd[0]._id;
  match.player2Id = playersToAdd[1].id || playersToAdd[1]._id;
  match.winner = 0;
  match.save();

  await EntryModel.updateMany(
    {
      _id: {
        $in: playersToAdd.map((p) => p.id || p._id),
      },
    },
    {
      tournamentId: FAKE_TOURNAMENT_ID,
    }
  );

  return {
    matchId: match.matchId,
    first: {
      id: match.player1Id,
      character: playersToAdd[0].character,
      name: playersToAdd[0].name,
    },
    second: {
      id: match.player2Id,
      character: playersToAdd[1].character,
      name: playersToAdd[1].name,
    },
  };
};
export const givePointsToUser = async (
  twitchId: string,
  points: number
): Promise<Award | null> => {
  const user = await UserModel.findOneAndUpdate(
    {
      twitchId,
    },
    {
      $inc: {
        points,
      },
    }
  );

  if (!user) {
    console.log(`Could not find ${twitchId} ?!?`);
    return null;
  }

  return {
    userId: twitchId,
    userName: user.twitchUsername,
    points,
  };
};
