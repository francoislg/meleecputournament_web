import robot from 'robotjs';
import Jimp from 'jimp';

export interface ScreenSize {
  width: number;
  height: number;
}

export const getScreenSize = () => {
  return robot.getScreenSize();
};

export const regionOffset = (
  { x: offsetX, y: offsetY }: { x: number; y: number },
  { x, y, w, h }: Region
): Region => {
  return {
    x: x + offsetX,
    y: y + offsetY,
    w,
    h,
  };
};

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const captureImage = ({ x, y, w, h }: Region) => {
  const pic = robot.screen.capture(x, y, w, h);
  const width = pic.byteWidth / pic.bytesPerPixel; // pic.width is sometimes wrong!
  const height = pic.height;
  const image = new Jimp(width, height);
  let red: number, green: number, blue: number;
  pic.image.forEach((byte: number, i: number) => {
    switch (i % 4) {
      case 0:
        return (blue = byte);
      case 1:
        return (green = byte);
      case 2:
        return (red = byte);
      case 3:
        image.bitmap.data[i - 3] = red;
        image.bitmap.data[i - 2] = green;
        image.bitmap.data[i - 1] = blue;
        image.bitmap.data[i] = 255;
    }
    return;
  });
  return new Image(image);
};

export const getReference = async (file: string) => new Image(await Jimp.read(file));

export class Image {
  constructor(protected image: Jimp) {}

  isMatching({ image }: Image) {
    const diff = Jimp.diff(this.image, image).percent;
    return diff <= 0.01;
  }

  getRegion({ x, y, w, h }: Region) {
    return new Image(this.image.clone().crop(x, y, w, h));
  }

  async save(file: string) {
    await this.image.writeAsync(file);
  }
}
