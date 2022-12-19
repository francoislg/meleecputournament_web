import { EntryModel } from "./models/Entry";
import { UserModel } from "./models/User";
import { BetModel } from "./models/Bet";
import { ISingleMatchModel, SingleMatchModel } from "./models/SingleMatch";
import { createDummyEntries } from "./entries";
import {
  getBetsForMatch,
  getPossibleEntries,
} from "./tournament-commands";
import { tryParseNumber } from "./parsing";
import { CURRENT_RULESET, POINTS } from "./constants";
import { MatchMessage } from "./types";

// BE CAREFUL, with `.aggregate`, the entries do not have the `id` property.
export const twoNextEntries = async () => {
  const firstTwo = await EntryModel.aggregate([
    {
      $addFields: {
        isDummy: { $cond: [{ $not: ["$userId"] }, 2, 1] },
      },
    },
    {
      $match: {
        tournamentId: null,
      },
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
        isDummy: { $first: "$isDummy" },
        createdAt: { $first: "$createdAt" },
      },
    },
    {
      $sort: {
        isDummy: 1,
        createdAt: 1,
      },
    },
  ]).limit(2);

  if (firstTwo.length < 2) {
    console.log("Adding dummies to match");
    const dummies = await EntryModel.find({
      tournamentId: null,
      userId: null,
    })
      .sort({
        createdAt: 1,
      })
      .skip(firstTwo.length)
      .limit(2 - firstTwo.length);

    firstTwo.push(...dummies);
  }

  return firstTwo;
};

export const FAKE_TOURNAMENT_ID = "singlematches";

const NUMBER_OF_ENTRIES_FOR_TOURNAMENT = 8;

export const hasEnoughEntriesForTournament = async () => {
  const entries = await getPossibleEntries().limit(
    NUMBER_OF_ENTRIES_FOR_TOURNAMENT
  );

  return (
    entries.filter((entry) => !!entry.userId).length >=
    NUMBER_OF_ENTRIES_FOR_TOURNAMENT
  );
};

export const hasSingleMatchInProgress = async () => {
  const match = await SingleMatchModel.findOne({
    winner: 0,
  });

  return match !== null;
};

export type Award = {
  points: number;
  userId: string;
  userName: string;
};

export const finishSingleMatch = async (
  matchId: number,
  {
    winnerId,
    loserId,
    isWinnerFirstPlayer,
  }: { winnerId: number; loserId: number; isWinnerFirstPlayer: boolean }
) => {
  console.log(`Finishing match ${FAKE_TOURNAMENT_ID}/${matchId}: ${winnerId}`);
  const winningEntry = await EntryModel.findById(winnerId);

  let awards: Award[] = [];

  if (winningEntry?.userId) {
    const losingEntry = await EntryModel.findById(loserId);
    if (losingEntry?.userId !== winningEntry.userId) {
      const award = await givePointsToUser(winningEntry.userId, POINTS.WIN);
      if (award) {
        awards.push(award);
      }
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
    isCustomMatch:
      firstParticipant.userId &&
      firstParticipant.userId === secondParticipant.userId,
    ruleset: match.ruleset,
    first: {
      id: match.player1Id,
      character: firstParticipant?.character || "???",
      name: firstParticipant?.name || "???",
      temporary: !firstParticipant?.userId,
      color: tryParseNumber(firstParticipant?.color),
    },
    second: {
      id: match.player2Id,
      character: secondParticipant?.character || "???",
      name: secondParticipant?.name || "???",
      temporary: !secondParticipant?.userId,
      color: tryParseNumber(secondParticipant?.color),
    },
  };
};

export const getNextSingleMatch = async (): Promise<MatchMessage | null> => {
  console.log("Getting the next single match");

  const match = await SingleMatchModel.findOne({
    winner: 0,
  })
    .sort({
      createdAt: 1,
    })
    .exec();

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
    })
      .sort({
        createdAt: 1,
      })
      .exec();

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
      userId,
      color,
    } = entries[0] || {};
    const {
      _id: secondId = 0,
      character: secondCharacter = "???",
      name: secondName = "The next entry or a dummy",
      userId: secondUserId,
      color: secondColor,
    } = entries[1] || {};

    const matchId = await getNextMatchId();

    return {
      matchId,
      isCustomMatch: userId && userId === secondUserId,
      ruleset: CURRENT_RULESET,
      first: {
        id,
        character,
        name,
        temporary: !userId,
        color: tryParseNumber(color),
      },
      second: {
        id: secondId,
        character: secondCharacter,
        name: secondName,
        temporary: !secondUserId,
        color: tryParseNumber(secondColor),
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
  )
    .sort({
      createdAt: 1,
    })
    .exec();
};
export const getNextMatchId = async () => {
  const [{ matchId }] = await SingleMatchModel.find()
    .sort({ matchId: -1 })
    .limit(1);
  return matchId + 1;
};
export const createSingleMatchBetween = async (
  player1: { id; character; name; color },
  player2: { id; character; name; color },
  { isCustomMatch }: { isCustomMatch: boolean }
): Promise<MatchMessage> => {
  const matchId = await getNextMatchId();
  const match = new SingleMatchModel();
  match.matchId = matchId;
  match.started = false;
  match.player1Id = player1.id;
  match.player2Id = player2.id;
  match.winner = 0;
  match.ruleset = CURRENT_RULESET;
  match.save();

  await EntryModel.updateMany(
    {
      _id: {
        $in: [player1.id, player2.id],
      },
    },
    {
      tournamentId: FAKE_TOURNAMENT_ID,
    }
  );

  return {
    matchId: match.matchId,
    isCustomMatch,
    ruleset: match.ruleset,

    first: {
      id: match.player1Id,
      character: player1.character,
      name: player1.name,
      color: tryParseNumber(player1.color),
    },
    second: {
      id: match.player2Id,
      character: player2.character,
      name: player2.name,
      color: tryParseNumber(player2.color),
    },
  };
};
export const createSingleMatch = async (): Promise<MatchMessage> => {
  console.log(`Creating a single match`);

  const playersToAdd = await twoNextEntries();

  if (playersToAdd.length < 2) {
    const created = await createDummyEntries(2 - playersToAdd.length);
    playersToAdd.push(...created);
  }

  const [player1, player2] = playersToAdd;

  return createSingleMatchBetween(
    {
      id: player1.id || player1._id,
      character: player1.character,
      name: player1.name,
      color: player1.color,
    },
    {
      id: player2.id || player2._id,
      character: player2.character,
      name: player2.name,
      color: player2.color,
    },
    {
      isCustomMatch: false,
    }
  );
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
