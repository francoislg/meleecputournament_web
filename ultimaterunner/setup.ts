import readline from 'readline';
import { readWindow, REFERENCES_FOLDER, WINDOW_SIZE } from './constants';
import { getScreenSize, captureImage, Region, regionOffset } from './screencapture';
import { randomCharacter, withController } from './smashultimatecontroller';
import {
  mainMenu,
  ruleset,
  stageSelection,
  css,
  isPlayerOneACPU,
  isPlayerTwoACPU,
  didPlayer1Win,
  didPlayer2Win,
  isMatchOver,
  isMatchInProgress,
} from './smashultimatestates';
import { AppState, stateMatcher } from './states';
import {YuzuCheck} from "./yuzu";

//const FULL_SCREEN_FILE = `${REFERENCES_FOLDER}/fullscreen.png`;
const WINDOW_FILE = `${REFERENCES_FOLDER}/window.png`;

export const setup = async () => {
  console.log('Starting the setup, booting the game.');

  await withController(async (ult) => {
    const yuzu = new YuzuCheck(ult);
    await yuzu.boot();

    const screen = getScreenSize();
    console.log('Screen size:', screen);

    const captureAndSave = async (region: Region, fileName: string) => {
      const image = await captureImage(region);
      await image.save(fileName);
    };

    const windowOffset = await readWindow();
    const windowUpdate = async () =>
      await captureAndSave({ x: windowOffset.x, y: windowOffset.y, ...WINDOW_SIZE }, WINDOW_FILE);
    await windowUpdate();
      /*
    do {
      await captureAndSave({ x: 0, y: 0, w: screen.width, h: screen.height }, FULL_SCREEN_FILE);

      windowOffset = await screenSetup();
      await windowUpdate();
      valid = await yesnoQuestion(`Please validate ${WINDOW_FILE}, does it seem correct?`);
    } while (!valid);*/

    type OnReferenceFinish = () => Promise<void>;

    if (
      await yesnoQuestion(
        `Do you want to update all the menu references? Ensure that your game is freshly booted.`
      )
    ) {
      const referencesToGet: [AppState, string, OnReferenceFinish][] = [
        [mainMenu, 'Press enter when you are on the main menu', () => ult.getToRuleSetFromStart()],
        [ruleset, 'Press enter when you are in the rule sets', () => ult.selectDefaultRuleset()],
        [
          stageSelection,
          'Press enter when you are on the stage selection screen',
          () => ult.selectStage(),
        ],
        [css, 'Press enter when you are on character selection screen', () => ult.setAsCPU()],
      ];

      for (let [state, q, onFinish] of referencesToGet) {
        await question(q);
        await windowUpdate();
        await captureAndSave(regionOffset(windowOffset, state.region), state.referenceFile);
        await onFinish();
      }

      await question('Press enter to confirm the players are CPUs');

      await captureAndSave(
        regionOffset(windowOffset, isPlayerOneACPU.region),
        isPlayerOneACPU.referenceFile
      );
      await captureAndSave(
        regionOffset(windowOffset, isPlayerTwoACPU.region),
        isPlayerTwoACPU.referenceFile
      );

      await ult.selectCharactersAndStart(randomCharacter(), randomCharacter());

      await question('Press enter to confirm the match has started');

      await captureAndSave(
        regionOffset(windowOffset, isMatchInProgress.region),
        isMatchInProgress.referenceFile
      );
    } else if (
      await yesnoQuestion(
        `Do you want to update all the win reference?. You can restart from pretty much anywhere.`
      )
    ) {
      const { match: match, capture: refresh } = await stateMatcher();

      let isAlreadyOnWin = false;
      if (await match(mainMenu)) {
        console.log('Restarting from Main Menu Selection');
        await ult.getToRuleSetFromStart();
        await ult.selectDefaultRuleset();
        await ult.selectStage();
      } else if (await match(ruleset)) {
        console.log('Restarting from Ruleset');
        await ult.selectDefaultRuleset();
        await ult.selectStage();
      } else if (await match(stageSelection)) {
        console.log('Restarting from Stage Selection');
        await ult.selectStage();
      } else if (await match(css)) {
        console.log('Restarting from CSS');
      } else {
        isAlreadyOnWin = await yesnoQuestion(
          `Could not detect the state, is it already on the win state? If not, it will assume start of game.`
        );
        if (!isAlreadyOnWin) {
          console.log('Assuming in start of the game');
          await ult.startTheGame();
          await ult.getToRuleSetFromStart();
          await ult.selectDefaultRuleset();
          await ult.selectStage();
        }
      }
      await refresh();

      if (!isAlreadyOnWin) {
        if (!(await match(isPlayerOneACPU))) {
          await ult.setAsCPU();
        }

        await ult.selectCharactersAndStart(randomCharacter(), randomCharacter());

        await question('Press enter to confirm the first match is over');
        await captureAndSave(
          regionOffset(windowOffset, isMatchOver.region),
          isMatchOver.referenceFile
        );

        await ult.pressAOnTheWinScreen();
      } else if (await yesnoQuestion(`Are you in the first victory screen where you can't see the winner positions yet?`)) {
        await captureAndSave(
          regionOffset(windowOffset, isMatchOver.region),
          isMatchOver.referenceFile
        );

        await ult.pressAOnTheWinScreen();
      }

      let done: boolean;
      do {
        const player = await question(
          'Enter the player that won (1|2|skip). Be careful on this step, the screenshot should not include shines if possible'
        );

        if (player === '1') {
          await captureAndSave(
            regionOffset(windowOffset, didPlayer1Win.region),
            didPlayer1Win.referenceFile
          );
        }
        if (player === '2') {
          await captureAndSave(
            regionOffset(windowOffset, didPlayer2Win.region),
            didPlayer2Win.referenceFile
          );
        }

        await ult.finishTheMatch();

        done = await yesnoQuestion(`Are you done updating the win references?`);

        if (!done) {
          await ult.selectStage();
          await ult.selectCharactersAndStart(randomCharacter(), randomCharacter());
          await question('Press enter to confirm the first match is over');
          await ult.pressAOnTheWinScreen();
        }
      } while (!done);
    }
  });
};

const yesnoQuestion = async (q: string) => {
  const answer = ((await question(`${q} (Y/n).`)) || 'y').toLowerCase();

  return answer === 'y';
};

const question = (question: string) => {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${question}\n`, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};
