import { CHARACTERS } from "../constants";
import { IEntryModel } from "../models/Entry";
import { ISingleMatchModel, SingleMatchModel } from "../models/SingleMatch";
import { connectToMongo } from "../Mongo";
import { mkdir, writeFile } from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";

const BASE_DATA_DIR = path.join(__dirname, "data");

interface CharacterMatrix {
  [winner: string]: {
    wonAgainst: {
      [loser: string]: {
        count: number;
      };
    };
    wins: number;
    loses: number;
    count: number;
  };
}

function createCharacterMatrix(): CharacterMatrix {
  const matrix: CharacterMatrix = {};
  return CHARACTERS.reduce(
    (all, char) => ({
      ...all,
      [char]: {
        count: 0,
        wins: 0,
        loses: 0,
        wonAgainst: CHARACTERS.reduce(
          (a, c) => ({
            ...a,
            [c]: {
              count: 0,
            },
          }),
          all
        ),
      },
    }),
    matrix
  );
}

async function createDataDir() {
  if (!existsSync(BASE_DATA_DIR)) {
    await mkdir(BASE_DATA_DIR);
  }
}

async function report() {
  await createDataDir();
  const mongo = await connectToMongo();
  try {
    const perRuleset = {
      fair: createCharacterMatrix(),
      chaotic: createCharacterMatrix(),
      other: createCharacterMatrix(),
    };

    const matches = await SingleMatchModel.aggregate<
      ISingleMatchModel & {
        player1: Array<IEntryModel>;
        player2: Array<IEntryModel>;
      }
    >([
      { $addFields: { p1id: { $toObjectId: "$player1Id" } } },
      { $addFields: { p2id: { $toObjectId: "$player2Id" } } },
      {
        $lookup: {
          from: "entries",
          localField: "p1id",
          foreignField: "_id",
          as: "player1",
        },
      },
      {
        $lookup: {
          from: "entries",
          localField: "p2id",
          foreignField: "_id",
          as: "player2",
        },
      },
    ]);
    console.log(`${matches.length} matches`);
    matches.forEach((match) => {
      if (!match.player1?.[0]?.character) {
        console.log("Missing player1 for", match);
        return;
      }
      if (!match.player2?.[0]?.character) {
        console.log("Missing player2 for", match);
        return;
      }
      if (match.winner === 0) {
        return;
      }
      const winner =
        match.winner === 1
          ? match.player1[0].character
          : match.player2[0].character;
      const loser =
        match.winner === 1
          ? match.player2[0].character
          : match.player1[0].character;

      const perRule = perRuleset[match.ruleset];
      if (!perRule) {
        console.log("Missing ruleset", match);
        return;
      }
      if (!(winner in perRule)) {
        console.log("Match has a weird winner", match);
        return;
      }
      if (!(loser in perRule[winner].wonAgainst)) {
        console.log("Match has a weird loser", match);
        return;
      }
      perRule[winner].count += 1;
      perRule[winner].wins += 1;
      perRule[loser].count += 1;
      perRule[loser].loses += 1;
      perRule[winner].wonAgainst[loser].count += 1;
    });

    await Promise.all(
      Object.entries(perRuleset).map(async ([ruleset, perRule]) => {
        const firstLine = "winner →," + CHARACTERS.join(",") + "\n";
        const winRows = CHARACTERS.map((x) => {
          return (
            x +
            "," +
            CHARACTERS.map((y) => perRule[y].wonAgainst[x].count).join(",")
          );
        }).join("\n");
        const playsHeader = ["", "Wins, Loses, Total"].join(",") + "\n";
        const playsRows = CHARACTERS.map((x) =>
          [x, perRule[x].wins, perRule[x].loses, perRule[x].count].join(",")
        ).join("\n");
        await writeFile(
          path.join(BASE_DATA_DIR, `${ruleset}_wins.csv`),
          `${firstLine}${winRows}`
        );
        await writeFile(
          path.join(BASE_DATA_DIR, `${ruleset}_plays.csv`),
          `${playsHeader}${playsRows}`
        );
      })
    );

    console.log("Finished");
  } finally {
    await mongo.disconnect();
  }
}

report().catch((error) => console.error(error));
