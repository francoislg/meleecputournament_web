import { randomCharacter, withController } from './smashultimatecontroller';
import { SmashApp } from './smashultimateapp';
import { YuzuCheck } from "./yuzu"
import { io } from 'socket.io-client';

import type { MatchResponseMessage } from '../server/pc-server';
import type { MatchMessage } from '../server/tournament-commands';

const SECRET_PC_KEY = 'zunHp5gte9kBVUiqzXYw33eN3po78L';

export const runWithServer = async () => {
  let IS_RECONNECTING = false;
  const socket = io('ws://localhost:8080/', {});

  let currentMatch: MatchMessage | null;
  let startCurrentMatch: boolean;
  let charactersSelected: boolean;
  let bufferedWinner: number | null;

  socket.on('match', async (match: MatchMessage) => {
    console.log("Received match!", match);
    if (bufferedWinner) {
      console.log("Stored a winner without a match, sending it now!");
      reportWinner(bufferedWinner, match);
    } else {
      currentMatch = match;
    }
  });

  socket.on('startmatch', () => {
    startCurrentMatch = true;
  });

  const askForReemit = () => {
    console.log("Asking to re emit match");
    socket.emit('reemitlast');
    charactersSelected = false;
  }

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
  }

  const yuzu = new YuzuCheck();

  await yuzu.boot();
  console.log("Booted!");
  setInterval(() => yuzu.tick(), 5000);

  socket.on('connect', () => {
    socket.emit('iamtheserver', SECRET_PC_KEY, IS_RECONNECTING);
    IS_RECONNECTING = true;
  });

  await withController(async (ult) => {
    let nbInProgressInARow = 0;
    let nbReadyInARow = 0;
    while (1) {
      const app = new SmashApp(ult);

      const { readyForMatch, playerWon, matchInProgress, nextDelay } = await app.tick();

      if (readyForMatch) {
        if (++nbReadyInARow > 10) {
          nbReadyInARow = 0;
          // Just in case
          askForReemit();
        }
        if (currentMatch) {
          if (!charactersSelected) {
            charactersSelected = true;
            await ult.justSelectCharacters(currentMatch.first.character,
              currentMatch.second.character);
          }
          if (startCurrentMatch) {
            await ult.startMatch();
            await waitFor(2000);
            // Failsafe if the match didn't start for some reason.
            const {readyForMatch} = await app.tick();
            if (readyForMatch) {
              charactersSelected = false;
            }
          } else {
            console.log("Server did not send the OK");
          }
        } else if (startCurrentMatch) {
          console.log("Have no match but it's ready, need to reemit!");
          askForReemit();
        } else {
          console.log("Waiting for a match")
        }
      } else {
        nbReadyInARow = 0;
      }

      if (matchInProgress) {
        if (++nbInProgressInARow > 10) {
          nbInProgressInARow = 0;
          console.log("Pressing A just in case we are in the starting cinematic")
          await ult.pressAOnTheWinScreen();
          await waitFor(500);
          await ult.pressAOnTheWinScreen();
        }
        if (!currentMatch) {
          askForReemit();
        }
      } else {
        nbInProgressInARow = 0;
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
