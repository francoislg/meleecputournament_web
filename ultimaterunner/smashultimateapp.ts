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
} from './smashultimatestates';
import { stateMatcher } from './states';

enum SmashState {
    MAIN_MENU,
    RULESET,
    STAGE_SELECTION,
    CSS,
    MATCH_IN_PROGRESS,
    MATCH_FINISHED,
    MATCH_FINISHED_CHECKING_WINNERS,
};

export interface ITickResponse {
    readyForMatch?: boolean;
    playerWon?: number;
    nextDelay?: number;
    matchInProgress?: boolean;
}

export class SmashApp {
  private stateMatcher = stateMatcher();
  constructor(private ult: SmashUltimateControllers) {}

  async tick(): Promise<ITickResponse> {
    const { match, capture } = this.stateMatcher;

    const state = await this.getNextState();

    switch (state) {
        case SmashState.MAIN_MENU:
            await this.ult.getToRuleSetFromStart();
        case SmashState.RULESET:
            await this.ult.selectDefaultRuleset();
        case SmashState.STAGE_SELECTION:
            await this.ult.selectStage();
        case SmashState.CSS:
            await capture();

            if (!(await match(isPlayerOneACPU))) {
                await this.ult.setAsCPU();
            };
            return {
              readyForMatch: true
            };
        case SmashState.MATCH_FINISHED:
            await waitFor(1000);
            await this.ult.pressAOnTheWinScreen();
        case SmashState.MATCH_FINISHED_CHECKING_WINNERS:
            let playerWon = await this.checkForWinner();

            if (playerWon) {
              await this.ult.finishTheMatch();

              return {
                playerWon,
              };
            } else {
              return {nextDelay: 200};
            }
        case SmashState.MATCH_IN_PROGRESS:
          return {nextDelay: 5000, matchInProgress: true};
    }

    return {};
  }

  // Might want to split those two methods into "Screens".
  private async getNextState() {
    let previousState = await this.detectFullState();
    await waitFor(500);
    let state = await this.detectFullState();
    while (state != previousState) {
      console.log("State do not match", state, previousState);
      previousState = state;
      await waitFor(500);
      state = await this.detectFullState();
    }
    return state;
  }

  private async detectFullState(): Promise<SmashState> {
    const { capture, match } = this.stateMatcher;

    await capture();

    if (await match(mainMenu)) {
        return SmashState.MAIN_MENU;
    } else if (await match(ruleset)) {
        return SmashState.RULESET;
    } else if (await match(stageSelection)) {
      return SmashState.STAGE_SELECTION;
    } else if (await match(css)) {
      return SmashState.CSS;
    } else if (await this.checkForMatchOver()) {
      return SmashState.MATCH_FINISHED;
    } else if (await this.checkForWinner()) {
        return SmashState.MATCH_FINISHED_CHECKING_WINNERS;
    } else {
      return SmashState.MATCH_IN_PROGRESS;
    }
  }

  private async checkForWinner() {
    const { match } = await stateMatcher();
    if (await match(didPlayer1Win)) {
      return 1;
    } else if (await match(didPlayer2Win)) {
      return 2;
    }

    return 0;
  }

  private async checkForMatchOver() {
    const { match } = this.stateMatcher;
    return (await match(isMatchOver)) && !(await match(isMatchInProgress));
  }
}

const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
