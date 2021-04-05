import { REFERENCES_FOLDER } from './constants';
import { AppState } from './states';

export const mainMenu: AppState = {
  description: 'The main menu, with the Smash, Spirits, Vault, etc...',
  referenceFile: REFERENCES_FOLDER + '/mainmenu.png',
  region: {
    x: 1650,
    y: 872,
    w: 25,
    h: 25,
  },
};

export const ruleset: AppState = {
  description: 'The screen with the rule sets',
  referenceFile: REFERENCES_FOLDER + '/ruleset.png',
  region: {
    x: 150,
    y: 35,
    w: 25,
    h: 25,
  },
};

export const stageSelection: AppState = {
  description: 'The stage selection screen',
  referenceFile: REFERENCES_FOLDER + '/stage.png',
  region: {
    x: 1222,
    y: 38,
    w: 50,
    h: 10,
  },
};

export const css: AppState = {
  description: 'The character selection screen',
  referenceFile: REFERENCES_FOLDER + '/css.png',
  region: {
    x: 45,
    y: 20,
    w: 25,
    h: 25,
  },
};

export const isPlayerOneACPU: AppState = {
  description: 'Whether the player 1 is a cpu',
  referenceFile: REFERENCES_FOLDER + '/p1cpu.png',
  region: {
    x: 516,
    y: 1014,
    w: 25,
    h: 25,
  },
};

export const isPlayerTwoACPU: AppState = {
  description: 'Whether the player 2 is a cpu',
  referenceFile: REFERENCES_FOLDER + '/p2cpu.png',
  region: {
    x: 1436,
    y: 1014,
    w: 25,
    h: 25,
  },
};

export const isMatchOver: AppState = {
  description: 'Whether the match is over',
  referenceFile: REFERENCES_FOLDER + '/matchover.png',
  region: {
    x: 22,
    y: 900,
    w: 50,
    h: 50,
  },
};

export const isMatchInProgress: AppState = {
  description: 'Whether the match is still in progress, which the countdown',
  referenceFile: REFERENCES_FOLDER + '/matchinprogress.png',
  region: {
    x: 1706,
    y: 67,
    w: 8,
    h: 8,
  },
};

export const didPlayer1Win: AppState = {
  description: 'Whether the player 1 won',
  referenceFile: REFERENCES_FOLDER + '/p1won.png',
  region: {
    x: 696,
    y: 54,
    w: 50,
    h: 10,
  },
};

export const didPlayer2Win: AppState = {
  description: 'Whether the player 2 won',
  referenceFile: REFERENCES_FOLDER + '/p2won.png',
  region:  {
    x: 1492,
    y: 54,
    w: 50,
    h: 10,
  },
};
