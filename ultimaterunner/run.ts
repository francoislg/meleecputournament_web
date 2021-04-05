import { randomCharacter, withController } from './smashultimatecontroller';
import { SmashApp } from './smashultimateapp';
import { io } from "socket.io-client";

export const runWithServer = async () => {
  const socket = io("ws://localhost:8080/", {});

  socket.on("connect", () => {
      console.log(`connect ${socket.id}`);
  });

  socket.on("disconnect", () => {
      console.log(`disconnect`);
  });

  setInterval(() => {
      const start = Date.now();
      socket.emit("ping", () => {
          console.log(`pong (latency: ${Date.now() - start} ms)`);
      });
  }, 1000);
}

export const run = async () => {
  await withController(async (ult) => {

    while (1) {
      const app = new SmashApp(ult);

      const {readyForMatch, playerWon, nextDelay} = await app.tick();

      if (readyForMatch) {
        console.log("Ready for a match!");
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
