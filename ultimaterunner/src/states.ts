import { IS_USING_REAL_SWITCH } from './args';
import { readWindow, WINDOW_SIZE } from './constants';
import { captureImage, getReference, Region } from './screencapture';
import { captureSwitchImage } from './switchscreencapture';

export interface AppState {
  description: string;
  referenceFile: string;
  region: Region;
}

export interface AppStates {
  states: AppState[];
}

export const capture = async () => {
  if (IS_USING_REAL_SWITCH) {
    return captureSwitchImage();
  } else {
    return captureImage({ ...(await readWindow()), ...WINDOW_SIZE });
  }
};

export const stateMatcher = () => {
  let image: ReturnType<typeof captureImage>;
  let windowPosition: { x: number; y: number };
  const capture = IS_USING_REAL_SWITCH
    ? async () => {
        image = await captureSwitchImage();
      }
    : async () => {
        windowPosition = windowPosition || (await readWindow());
        image = await captureImage({ ...windowPosition, ...WINDOW_SIZE });
      };
  const match = async (state: AppState) => {
    if (!image) {
      await capture();
    }
    const reference = await getReference(state.referenceFile);
    const cropped = image.getRegion(state.region);
    return reference.isMatching(cropped);
  };
  return {
    capture,
    match,
  };
};
