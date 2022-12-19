import { Inputs } from "./controller";
import { SmashApp } from "./smashultimateapp";
import { randomCharacter, withController } from "./smashultimatecontroller";


export const runForUnlock = async () => {
    console.log("Running in unlock mode");
    await withController(async (ult) => {
      while (1) {
        const app = new SmashApp(ult);
  
        const { readyForMatch, matchInProgress, playerWon, nextDelay } = await app.tick();
  
        if (readyForMatch) {
          console.log('Ready for a match!');
          await ult.selectPlayer1Character(randomCharacter());
          await waitFor(10000);
        }

        if (matchInProgress) {
            await ult.controllers.player1.press(Inputs.LEFT).forMilliseconds(5000).execute();
        }
  
        if (playerWon) {
          console.log(`Player ${playerWon} won!`);
        }
  
        await waitFor(nextDelay || 2000);
      }
    });
  };
  

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
