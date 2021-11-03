import { randomCharacter, withController } from './smashultimatecontroller';
import { SmashApp } from './smashultimateapp';
import { YuzuCheck } from './yuzu';
import { io } from 'socket.io-client';

import type { MatchResponseMessage } from '../server/pc-server';
import type { MatchMessage } from '../server/tournament-commands';
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
import { Image, Region } from './screencapture';

const SECRET_PC_KEY = 'zunHp5gte9kBVUiqzXYw33eN3po78L';

export const runWithServer = async () => {
  let IS_RECONNECTING = false;
  const socket = io('ws://localhost:8080/', {});

  let currentMatch: MatchMessage | null;
  let startCurrentMatch: boolean;
  let charactersSelected: boolean;
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
    charactersSelected = false;
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
    charactersSelected = false;
    startCurrentMatch = false;
  };

  socket.on('connect', () => {
    socket.emit('iamtheserver', SECRET_PC_KEY, IS_RECONNECTING);
    IS_RECONNECTING = true;
  });

  const checkCharacterPick = async (image: Image, characterName: string, region: Region) => {
    const referenceImage = await getCharacterImageIfExist(characterName);
    const toCheck = image.getRegion(region);
    if (referenceImage) {
      if (!referenceImage.isMatching(toCheck, CHARACTERS_IMAGE_MATCHING_TOLERANCE))  {
        const mightBe = await whichCharacter(referenceImage);
        importantLog(characterName + " doesn't matches, could be any of: " + mightBe.join(","));
        await toCheck.save(characterReferenceFile(characterName + '_or_' + mightBe.join("_or_")));
      }
    } else {
      console.log('Taking pick for', characterName);
      await toCheck.save(characterReferenceFile(characterName));
    }
  };

  await withController(async (ult) => {
    const yuzu = new YuzuCheck(ult);
    if (!IS_USING_REAL_SWITCH) {
      await yuzu.boot();
      console.log('Booted!');
      await yuzu.tick();
    }

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
          if (!charactersSelected) {
            charactersSelected = true;
            await ult.justSelectCharacters(
              currentMatch.first.character,
              currentMatch.second.character
            );
            await waitFor(500);
            // This should collect the character pick, could be used later on to validate the actual pick.
            const image = await capture();
            await checkCharacterPick(image, currentMatch.first.character, player1Pick.region);
            await checkCharacterPick(image, currentMatch.second.character, player2Pick.region);

            await ult.selectColors();
          }
          if (startCurrentMatch) {
            await ult.startMatch();
            await waitFor(2000);
            // Failsafe if the match didn't start for some reason.
            const { readyForMatch } = await app.tick();
            if (readyForMatch) {
              console.log(
                "Resetting the character selection, looks like it didn't start the match"
              );
              charactersSelected = false;
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
        if (!currentMatch) {
          askForReemit();
        }
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
