// list: ffmpeg -list_devices true -f dshow -i dummy
// ffmpeg -f dshow -i video="USB3.0 HD Video Capture" -vframes 1 -q:v 2 output.jpg -y
// when OBS is running: ffmpeg -rtbufsize 100M -f dshow -i video="OBS-Camera" -vframes 1 -q:v 2 output.jpg -y

import { promisify } from 'util';
import { exec } from 'child_process';
import Jimp from 'jimp';
import { Image } from './screencapture';
import { importantLog } from './log';

const DEVICE = 'OBS-Camera';
const FILE = 'pic.jpg';

const run = promisify(exec);
const waitFor = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(toRun: () => Promise<T>) {
  while (1) {
    try {
      const result = await toRun();
      return result;
    } catch (err) {
      importantLog(`ERROR WHEN CAPTURING SCREENSHOT: ${err}`);
      await waitFor(2000);
    }
  }
  throw "well";
}

export const captureSwitchImage = async (): Promise<Image> => {
  await retry(() =>
    run(`ffmpeg -rtbufsize 100M -f dshow -i video="${DEVICE}" -frames 1 -q:v 1 ${FILE} -y`)
  );
  const img = await Jimp.read(FILE);
  return new Image(img);
};
