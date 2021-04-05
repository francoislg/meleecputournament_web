import { randomCharacter, withController } from './smashultimatecontroller';
import { SmashApp } from './smashultimateapp';
import { io } from 'socket.io-client';

import type { MatchResponseMessage } from '../server/pc-server';
import type { MatchMessage } from '../server/tournament-commands';

const SECRET_PC_KEY = 'zunHp5gte9kBVUiqzXYw33eN3po78L';

export const runWithServer = async () => {
  let IS_RECONNECTING = false;
  const socket = io('ws://localhost:8080/', {});

  socket.on('connect', () => {
    socket.emit('iamtheserver', SECRET_PC_KEY, IS_RECONNECTING);
    IS_RECONNECTING = true;
  });

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
  })

  const askForReemit = () => {
    console.log("Asking to re emit match");
    socket.emit('reemitlast');
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

  await withController(async (ult) => {
    while (1) {
      const app = new SmashApp(ult);

      const { readyForMatch, playerWon, matchInProgress, nextDelay } = await app.tick();

      if (readyForMatch) {
        console.log('Ready for a match!');
        if (currentMatch) {
          if (!charactersSelected) {
            charactersSelected = true;
            await ult.justSelectCharacters(currentMatch.first.character,
              currentMatch.second.character);
          }
          if (startCurrentMatch) {
            startCurrentMatch = false;
            await ult.startMatch();
          } else {
            console.log("Server did not send the OK");
          }
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
