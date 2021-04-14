import { REFERENCES_FOLDER } from './constants';
import { SmashUltimateControllers } from './smashultimatecontroller';
import {
  mainMenu,
  ruleset,
  stageSelection,
  css,
  isMatchOver,
  isPlayerOneACPU,
  didPlayer1Win,
  didPlayer2Win,
  isMatchInProgress,
  isPlayerTwoACPU,
} from './smashultimatestates';
import { stateMatcher } from './states';

enum SmashState {
  MAIN_MENU = 'mainmenu',
  RULESET = 'ruleset',
  STAGE_SELECTION = 'stageselection',
  CSS = 'css',
  MATCH_IN_PROGRESS = 'inprogress',
  MATCH_FINISHED = 'finished',
  MATCH_FINISHED_CHECKING_WINNERS = 'checkingwinners',
}

export interface ITickResponse {
  readyForMatch?: boolean;
  playerWon?: number;
  nextDelay?: number;
  matchInProgress?: boolean;
}

const withMatchEither = (match: ReturnType<typeof stateMatcher>['match']) => {
  const matcher: typeof match = async (state) =>
    (await match({
      ...state,
      referenceFile: state.referenceFile.replace(
        REFERENCES_FOLDER,
        REFERENCES_FOLDER + ' fullscreen'
      ),
    })) ||
    (await match({
      ...state,
      referenceFile: state.referenceFile.replace(
        REFERENCES_FOLDER,
        REFERENCES_FOLDER + ' blackbars'
      ),
    }));
  return matcher;
};

export class SmashApp {
  private stateMatcher = stateMatcher();
  constructor(private ult: SmashUltimateControllers) {}

  async tick(): Promise<ITickResponse> {
    const state = await this.getNextState();

    console.log('State:', state);

    switch (state) {
      case SmashState.MAIN_MENU:
        await this.ult.getToRuleSetFromStart();
      case SmashState.RULESET:
        await this.ult.selectDefaultRuleset();
      case SmashState.STAGE_SELECTION:
        await this.ult.selectStage();
      case SmashState.CSS:
        if (await this.trySetAsCPUACoupleOfTimes()) {
          return {
            readyForMatch: true,
          };
        } else {
          // Failed!
          return {};
        }
      case SmashState.MATCH_FINISHED:
        await waitFor(1000);
        await this.ult.pressAOnTheWinScreen();
        await waitFor(1000);
        return { nextDelay: 200 };
      case SmashState.MATCH_FINISHED_CHECKING_WINNERS:
        let playerWon = await this.checkForWinner();

        if (playerWon) {
          await this.ult.finishTheMatch();

          return {
            playerWon,
          };
        } else {
          return { nextDelay: 200 };
        }
      case SmashState.MATCH_IN_PROGRESS:
        return { nextDelay: 5000, matchInProgress: true };
    }

    return {};
  }

  private async trySetAsCPUACoupleOfTimes(): Promise<boolean> {
    const { capture, match } = this.stateMatcher;

    const matchEither = withMatchEither(match);

    const MAX_TRIES = 5;
    let tries = 0;

    await this.ult.moveJustABitToRegisterAsPlayersInCSS();

    await capture();
    let isP1Cpu = await matchEither(isPlayerOneACPU);
    let isP2Cpu = await matchEither(isPlayerTwoACPU);

    while (tries < MAX_TRIES && (!isP1Cpu || !isP2Cpu)) {
      await Promise.all([
        isP1Cpu ? Promise.resolve() : this.ult.setP1AsCPU(),
        isP2Cpu ? Promise.resolve() : this.ult.setP2AsCPU(),
      ]);

      await capture();

      isP1Cpu = await matchEither(isPlayerOneACPU);
      isP2Cpu = await matchEither(isPlayerTwoACPU);
      tries++;

      console.log(
        `p1: ${isP1Cpu}, p2: ${isP2Cpu}, tries: ${tries}, ${
          tries < MAX_TRIES && (!isP1Cpu || !isP2Cpu)
        }`
      );
    }

    return isP1Cpu && isP2Cpu;
  }

  private async getNextState() {
    let previousState = await this.detectFullState();
    await waitFor(500);
    let state = await this.detectFullState();
    while (state != previousState) {
      console.log('State do not match', state, previousState);
      previousState = state;
      await waitFor(500);
      state = await this.detectFullState();
    }
    return state;
  }

  private async detectFullState(): Promise<SmashState> {
    const { capture, match: originalMatch } = this.stateMatcher;

    const match = withMatchEither(originalMatch);

    await capture();

    if (await match(mainMenu)) {
      return SmashState.MAIN_MENU;
    } else if (await match(ruleset)) {
      return SmashState.RULESET;
    } else if (await match(stageSelection)) {
      return SmashState.STAGE_SELECTION;
    } else if (await match(css)) {
      return SmashState.CSS;
    } else if (await this.checkForWinner()) {
      return SmashState.MATCH_FINISHED_CHECKING_WINNERS;
    } else if (await this.checkForMatchOver()) {
      return SmashState.MATCH_FINISHED;
    } else {
      return SmashState.MATCH_IN_PROGRESS;
    }
  }

  private async checkForWinner() {
    const { match: originalMatch } = await stateMatcher();
    const match = withMatchEither(originalMatch);
    if (await match(didPlayer1Win)) {
      return 1;
    } else if (await match(didPlayer2Win)) {
      return 2;
    }

    return 0;
  }

  private async checkForMatchOver() {
    const { match: originalMatch } = this.stateMatcher;
    const match = withMatchEither(originalMatch);
    return (await match(isMatchOver)) && !(await match(isMatchInProgress));
  }
}

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
