import * as sheetConfig from "./sheets-creds.json";
import { CHARACTERS as ORIGINAL_CHARACTERS } from "../constants";
import { IEntryModel } from "../models/Entry";
import { ISingleMatchModel, SingleMatchModel } from "../models/SingleMatch";
import { connectToMongo } from "../Mongo";
import { mkdir, writeFile } from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import { GoogleSpreadsheet } from "google-spreadsheet";

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

const getFullName = ({
  character,
  miiConfiguration,
}: {
  character: string;
  miiConfiguration?: string;
}) => {
  return character + (!!miiConfiguration ? ` (${miiConfiguration})` : "");
};

const CHARACTERS = [
  ...ORIGINAL_CHARACTERS.filter(
    (char) =>
      char !== "MiiBrawler" && char !== "MiiGunner" && char !== "MiiSword"
  ),
  // If we ever had different miis, we'll need to update this
  "MiiBrawler (2313)",
  "MiiBrawler (2221)",
  "MiiGunner (1331)",
  "MiiGunner (1311)",
  "MiiSword (3111)",
  "MiiSword (1111)",
];

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
      {
        $addFields: {
          p1id: { $toObjectId: "$player1Id" },
          p2id: { $toObjectId: "$player2Id" },
        },
      },
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
          ? getFullName(match.player1[0])
          : getFullName(match.player2[0]);
      const loser =
        match.winner === 1
          ? getFullName(match.player2[0])
          : getFullName(match.player1[0]);

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
      perRule[loser].loses += 1;
      if (winner !== loser) {
        perRule[loser].count += 1;
      }
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

    const doc = new GoogleSpreadsheet(
      "1ZNuetoT2-R5X5Y-tCvwBo89fNR_uDr2szkmFgMpCpUM"
    );
    await doc.useServiceAccountAuth(sheetConfig);
    await doc.loadInfo();

    await Promise.all(
      Object.entries(perRuleset).map(async ([ruleset, perRule]) => {
        const playsSheetName = `"${ruleset}" Plays`;
        const playsSheet = await doc.sheetsByTitle[playsSheetName];
        const winsSheetName = `"${ruleset}" Wins Per Char`;
        const winsSheet = await doc.sheetsByTitle[winsSheetName];
        if (!playsSheet) {
          throw `Sheet ${playsSheetName} does not exist`;
        }
        if (!winsSheet) {
          throw `Sheet ${winsSheetName} does not exist`;
        }
        await playsSheet.loadCells();
        playsSheet.getCell(0, 0).value = "";
        playsSheet.getCell(0, 1).value = "Wins";
        playsSheet.getCell(0, 2).value = "Loses";
        playsSheet.getCell(0, 3).value = "Total";
        playsSheet.getCell(0, 4).value = "WIN RATE";
        playsSheet.getCell(1, 10).formula = `=SORT(H2:I${
          CHARACTERS.length + 1
        })`;
        for (let i = 0; i < CHARACTERS.length; i++) {
          const rowIndex = i + 1;
          const x = CHARACTERS[i];
          playsSheet.getCell(rowIndex, 0).value = x;
          playsSheet.getCell(rowIndex, 1).value = perRule[x].wins;
          playsSheet.getCell(rowIndex, 2).value = perRule[x].loses;
          playsSheet.getCell(rowIndex, 3).value = perRule[x].count;
          playsSheet.getCell(rowIndex, 3).value = perRule[x].count;
          playsSheet.getCell(rowIndex, 4).formula = `=IFERROR($B${rowIndex + 1}/$D${
            rowIndex + 1
          }; 0)`;

          playsSheet.getCell(rowIndex, 7).formula = `=$E${rowIndex + 1}`;
          playsSheet.getCell(rowIndex, 8).formula = `=$A${rowIndex + 1}`;
        }
        await playsSheet.saveUpdatedCells();

        await winsSheet.loadCells();
        winsSheet.getCell(0, 0).value = "winner →";
        CHARACTERS.forEach((x, i) => {
          const rowIndex = i + 1;
          winsSheet.getCell(i + 1, 0).value = x;
          winsSheet.getCell(0, i + 1).value = x;

          CHARACTERS.forEach((y, j) => {
            const colIndex = j + 1;
            winsSheet.getCell(rowIndex, colIndex).value =
              perRule[y].wonAgainst[x].count;
            if (rowIndex === colIndex) {
              winsSheet.getCell(rowIndex, colIndex).backgroundColor = {
                red: 0.9,
                green: 0.9,
                blue: 0.9,
                alpha: 1,
              };
            }
          });
        });
        await winsSheet.saveUpdatedCells();
      })
    );

    console.log("Finished");
  } finally {
    await mongo.disconnect();
  }
}

report().catch((error) => console.error(error));
