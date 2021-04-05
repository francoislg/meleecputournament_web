import { readWindow, WINDOW_SIZE } from './constants';
import { captureImage, getReference, Region } from './screencapture';

export interface AppState {
  description: string;
  referenceFile: string;
  region: Region;
}

export interface AppStates {
  states: AppState[];
}

export const stateMatcher = () => {
  let image: ReturnType<typeof captureImage>;
  let windowPosition: {x: number, y: number};
  const capture = async () => {
    windowPosition = windowPosition || (await readWindow());
    image = await captureImage({ ...windowPosition, ...WINDOW_SIZE });
  };
  const match = async (state: AppState) => {
    if (!image) {
      await capture();
    }
    const reference = await getReference(state.referenceFile);
    const cropped = await image.getRegion(state.region);
    cropped.save('bloup.png');
    return reference.isMatching(cropped);
  };
  return {
    capture,
    match,
  };
};
