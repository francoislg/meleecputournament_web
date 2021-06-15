
// ffmpeg -f dshow -i video="ShadowCast" -vframes 1 -q:v 2 output.jpg -y

import Jimp from "jimp";
import { Image } from "./screencapture";

export const captureSwitchImage = async (): Promise<Image> => {
    const FILE = "pic.jpeg";
    return new Image(await Jimp.read(FILE))
}