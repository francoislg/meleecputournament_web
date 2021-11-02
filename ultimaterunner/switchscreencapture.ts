
// list: ffmpeg -list_devices true -f dshow -i dummy
// ffmpeg -f dshow -i video="USB3.0 HD Video Capture" -vframes 1 -q:v 2 output.jpg -y
// when OBS is running: ffmpeg -rtbufsize 100M -f dshow -i video="OBS-Camera" -vframes 1 -q:v 2 output.jpg -y

import { promisify } from "util";
import {exec} from "child_process";
import Jimp from "jimp";
import { Image } from "./screencapture";

const DEVICE = "OBS-Camera";
const FILE = "pic.jpg";

const run = promisify(exec);

export const captureSwitchImage = async (): Promise<Image> => {
    await run(`ffmpeg -rtbufsize 100M -f dshow -i video="${DEVICE}" -frames 1 -q:v 1 ${FILE} -y`);
    const img = await Jimp.read(FILE);
    return new Image(img)
}