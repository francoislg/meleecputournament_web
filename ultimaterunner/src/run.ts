import { randomCharacter, withController } from './smashultimatecontroller';
import { SmashApp } from './smashultimateapp';
import { YuzuCheck } from './yuzu';
import { io } from 'socket.io-client';

import type { MatchResponseMessage } from '../../server/types';
import type { MatchMessage } from '../../server/types';
import { IS_USING_REAL_SWITCH } from './args';
import { capture } from './states';
import {
  characterReferenceFile,
  CHARACTERS_IMAGE_MATCHING_TOLERANCE,
  getCharacterImageIfExist,
  player1Pick,
  player2Pick,
  whichCharacter
} from "./characterreferences";
import { importantLog } from './log';
import { Region } from './screencapture';

const SECRET_PC_KEY = 'zunHp5gte9kBVUiqzXYw33eN3po78L';

export const runWithServer = async () => {
  let IS_RECONNECTING = false;
  const socket = io('ws://localhost:8080/', {});

  let currentMatch: MatchMessage | null;
  let startCurrentMatch: boolean;
  let isP1Selected: boolean;
  let isP2Selected: boolean;
  let bufferedWinner: number | null;

  socket.on('match', async (match: MatchMessage) => {
    console.log('Received match!', match);
    if (bufferedWinner) {
      console.log('Stored a winner without a match, sending it now!');
      reportWinner(bufferedWinner, match);
    } else {
      currentMatch = match;
    }
  });

  socket.on('startmatch', () => {
    startCurrentMatch = true;
  });

  const askForReemit = () => {
    console.log('Asking to re emit match');
    socket.emit('reemitlast');
    isP1Selected = false;
    isP2Selected = false;
  };

  const reportWinner = (player: number, match: MatchMessage) => {
    const isWinnerFirstPlayer = player === 1;
    const response: MatchResponseMessage = {
      winner: isWinnerFirstPlayer ? match.first : match.second,
      loser: isWinnerFirstPlayer ? match.second : match.first,
      matchId: match.matchId,
      isWinnerFirstPlayer,
    };
    socket.emit('winner', response);
    currentMatch = null;
    bufferedWinner = null;
    isP1Selected = false;
    isP2Selected = false;
    startCurrentMatch = false;
  };

  socket.on('connect', () => {
    socket.emit('iamtheserver', SECRET_PC_KEY, IS_RECONNECTING);
    IS_RECONNECTING = true;
  });

  const checkCharacterPick = async (characterName: string, region: Region) => {
    const image = await capture();
    const referenceImage = await getCharacterImageIfExist(characterName);
    const toCheck = image.getRegion(region);
    if (referenceImage) {
      if (!referenceImage.isMatching(toCheck, CHARACTERS_IMAGE_MATCHING_TOLERANCE))  {
        const mightBe = await whichCharacter(toCheck);
        if (mightBe.length === 1) {
          console.log("Reseting picks because it might have an exact match");
          return false;
        } else {
          // Don't need this anymore, it seems pretty stable
          // importantLog(characterName + " doesn't matches, could be any of: " + mightBe.join(","));
          // await toCheck.save(characterReferenceFile(characterName + '_or_' + mightBe.slice(0, 2).join("_or_")));
        }
      }
    } else {
      const mightBe = await whichCharacter(toCheck);
      if (mightBe.length === 0) {
        await toCheck.save(characterReferenceFile(characterName));
      } else {
        importantLog(characterName + " was picked but could be: " + mightBe.join(","));
      }
    }
    return true;
  };

  await withController(async (ult) => {
    const yuzu = new YuzuCheck(ult);
    if (!IS_USING_REAL_SWITCH) {
      await yuzu.boot();
      console.log('Booted!');
      await yuzu.tick();
    }

    let ticksInProgress = 0;

    while (1) {
      const app = new SmashApp(ult);

      const { readyForMatch, playerWon, matchInProgress, nextDelay } = await app.tick();

      if (!IS_USING_REAL_SWITCH) {
        // Do not test for Yuzu if the match is ready to start, otherwise it will detect a freeze while waiting for the start signal.
        if (!readyForMatch || startCurrentMatch) {
          await yuzu.tick();
        }
      }

      if (readyForMatch) {
        if (!!currentMatch) {
          if (!isP1Selected) {
            isP1Selected = true;
            await ult.selectPlayer1Character(currentMatch.first.character);
            await waitFor(500);
            if (await checkCharacterPick(currentMatch.first.character, player1Pick.region)) {
              await ult.setPlayer1Color(currentMatch.first.color);
            } else {
              isP1Selected = false;
            }
          }
          if (!isP2Selected) {
            isP2Selected = true;
            await ult.selectPlayer2Character(currentMatch.second.character);
            await waitFor(500);
            if (await checkCharacterPick(currentMatch.second.character, player2Pick.region)) {
              await ult.setPlayer2Color(currentMatch.second.color);
            } else {
              isP2Selected = false;
            }
          }
          if (!isP1Selected || !isP2Selected) {
            console.log("Character selection was nulled, waiting another tick.")
          } else if (startCurrentMatch) {
            console.log("Starting match");
            await ult.startMatch();
            await waitFor(2000);
            
            // Somehow, the `startMatch` failed once when done by player 1, so let's just try p2, just to be sure.
            const { readyForMatch: firstReadyForMatch } = await app.tick();
            if (firstReadyForMatch) {
              await ult.tryStartMatchWithPlayer2();
            }
            await waitFor(2000);
            // Failsafe if the match didn't start for some reason.
            const { readyForMatch } = await app.tick();
            if (readyForMatch) {
              console.log(
                "Resetting the character selection, looks like it didn't start the match"
              );
              isP1Selected = false;
              isP2Selected = false;
            }
          } else {
            console.log('Server did not send the OK');
          }
        } else if (startCurrentMatch) {
          console.log("Have no match but it's ready, need to reemit!");
          askForReemit();
        } else {
          console.log('Waiting for a match');
        }
      }

      if (matchInProgress) {
        // A little something to prevent the switch from going into sleep mode.
        ticksInProgress++;
        if (ticksInProgress % 10 === 9) {
          await ult.moveJustABitToRegisterAsPlayersInCSS();
        }
        if (!currentMatch) {
          askForReemit();
        }
      } else {
        ticksInProgress = 0;
      }

      if (playerWon) {
        if (currentMatch) {
          console.log(`Player ${playerWon} won! Reporting to server.`);
          reportWinner(playerWon, currentMatch);
        } else {
          console.log(`Player ${playerWon} won but we have no match, buffering winner.`);
          bufferedWinner = playerWon;
          askForReemit();
        }
      }

      await waitFor(nextDelay || 2000);
    }
  });
};

export const run = async () => {
  await withController(async (ult) => {
    while (1) {
      const app = new SmashApp(ult);

      const { readyForMatch, playerWon, nextDelay } = await app.tick();

      if (readyForMatch) {
        console.log('Ready for a match!');
        await ult.selectCharactersAndStart(randomCharacter(), randomCharacter());
      }

      if (playerWon) {
        console.log(`Player ${playerWon} won!`);
      }

      await waitFor(nextDelay || 2000);
    }
  });
};

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
