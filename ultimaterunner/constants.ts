import { readFile } from 'fs/promises';

export const WINDOW_SIZE = {
    w: 1920,
    h: 1080,
};
export const REFERENCES_FOLDER = 'references';
export const WINDOW_CONFIG_FILE = './windowconfig.json';

export const readWindow = async () => {
  const read = await readFile(WINDOW_CONFIG_FILE, 'utf-8');
  return JSON.parse(read);
};
