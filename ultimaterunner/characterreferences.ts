import { CHARACTERS_FOLDER } from './constants';
import { access, readdir } from 'fs/promises';
import Jimp from 'jimp';
import { Image } from './screencapture';

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

export const CHARACTERS_IMAGE_MATCHING_TOLERANCE = 0.02;

export const characterReferenceFile = (characterName: string) =>
  `${CHARACTERS_FOLDER}/${characterName}.png`;

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

export const whichCharacter = async (image: Image) => {
  const files = await readdir(CHARACTERS_FOLDER);
  const results = await Promise.all(
    files
      .map((file) => file.substring(0, file.length - '.png'.length))
      .map(
        async (characterName) =>
          [
            characterName,
            image.isMatching(
              new Image(await Jimp.read(`${CHARACTERS_FOLDER}/${characterName}.png`)),
              CHARACTERS_IMAGE_MATCHING_TOLERANCE
            ),
          ] as [string, boolean]
      )
  );
  return results.filter(([_results, matching]) => matching).map(([result]) => result);
};
