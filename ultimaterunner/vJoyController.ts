// @ts-ignore
import { vJoy, vJoyDevice } from 'vjoy';
import { Inputs, LowLevelController } from './controller';

const RANGES = {
  x: {
    min: 1,
    mid: 16385,
    max: 0x8000,
  },
  y: {
    min: 1,
    mid: 16385,
    max: 0x8000,
  },
};

export class VJoyController implements LowLevelController {
  private device: vJoyDevice;

  constructor(id: number) {
    if (!vJoy.isEnabled()) {
      console.log('vJoy is not enabled.');
      process.exit();
    }

    const existing = vJoy.existingDevices();
    if (existing < 2) {
      console.log(`You currently have ${existing} vJoy but you need at least 2.`);
    }

    if (!vJoyDevice.exists(id)) {
      console.log(`vJoy ID ${id} does not exist.`);
    }

    this.device = vJoyDevice.create(id);
    this.device.updateInputs();
  }

  free() {
    if (this.device) {
      this.releaseAll();
      this.device.free();
    }
  }

  hold(input: Inputs): this {
    const button = this.buttonToId(input);
    if (button) {
      this.device.buttons[button].set(true);
      return this;
    }
    switch (input) {
      case Inputs.UP:
        this.device.axes.Y.set(RANGES.y.min);
        break;
      case Inputs.DOWN:
        this.device.axes.Y.set(RANGES.y.max);
        break;
      case Inputs.LEFT:
        this.device.axes.X.set(RANGES.x.min);
        break;
      case Inputs.RIGHT:
        this.device.axes.X.set(RANGES.x.max);
        break;
    }
    return this;
  }

  release(input: Inputs): this {
    const button = this.buttonToId(input);
    if (button) {
      this.device.buttons[button].set(false);
      return this;
    }
    switch (input) {
      case Inputs.UP:
      case Inputs.DOWN:
        this.device.axes.Y.set(RANGES.y.mid);
        break;
      case Inputs.LEFT:
      case Inputs.RIGHT:
        this.device.axes.X.set(RANGES.x.mid);
        break;
    }
    return this;
  }

  releaseAll(): this {
    this.device.resetButtons();
    this.release(Inputs.DOWN);
    this.release(Inputs.LEFT);
    return this;
  }

  private buttonToId(input: Inputs): number | null {
    switch (input) {
      case Inputs.A:
        return 1;
      case Inputs.B:
        return 2;
      case Inputs.START:
        return 3;
      default:
      return null;
    }
  }
}
