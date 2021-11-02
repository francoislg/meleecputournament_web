import { CHARACTERS_FOLDER, REFERENCES_FOLDER } from './constants';
import { AppState } from './states';
import { access } from 'fs/promises';
import Jimp from 'jimp';
import { Image } from './screencapture';

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
    x: 1715,
    y: 73,
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
  region: {
    x: 1492,
    y: 54,
    w: 50,
    h: 10,
  },
};

// Those two should really really match
export const player1Pick = {
  region: {
    x: 549,
    y: 856,
    w: 300,
    h: 10,
  },
};

export const player2Pick = {
  region: {
    x: 1464,
    y: 856,
    w: 300,
    h: 10,
  },
};

export const characterReferenceFile = (characterName: string) => `${CHARACTERS_FOLDER}/${characterName}.png`; 

export const getCharacterImageIfExist = async (characterName: string) => {
  if (await hasCharacterImage(characterName)) {
    return new Image(await Jimp.read(characterReferenceFile(characterName)));
  }
  return null;
};


export const hasCharacterImage = async (characterName: string) => {
  try {
    await access(characterReferenceFile(characterName));
    return true;
  } catch {
    return false;
  }
};
