import { readFile } from 'fs/promises';
import { IS_USING_REAL_SWITCH } from './args';

export const WINDOW_SIZE = {
    w: 1920,
    h: 1080,
};
export const REFERENCES_FOLDER = 'references';
export const WINDOW_CONFIG_FILE = './windowconfig.json';

export const readWindow = async () => {
  if (IS_USING_REAL_SWITCH) {
    return {x: 0, y: 0};
  }
  const read = await readFile(WINDOW_CONFIG_FILE, 'utf-8');
  return JSON.parse(read);
};
