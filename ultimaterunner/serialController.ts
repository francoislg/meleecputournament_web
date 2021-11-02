import SerialPort from 'serialport';
import { Inputs, LowLevelController } from './controller';

export class SerialController implements LowLevelController {
  constructor(private port: SerialPort, private player: number) {
    if (player > 2) {
      throw new Error("This protocol only supports 2 players.");
    }
  }

  free() {
    if (this.port.isOpen) {
      this.releaseAll();
    }
  }

  hold(input: Inputs): this {
    const button = this.buttonToId(input);
    if (button) {
      this.port.write(button + "+" + "\n");
    }
    return this;
  }

  release(input: Inputs): this {
    const button = this.buttonToId(input);
    if (button) {
      this.port.write(button + "-" + "\n");
    }
    return this;
  }

  releaseAll(): this {
    this.port.write("c"+ "\n");
    return this;
  }

  private buttonToId(input: Inputs): number | null {
    if (this.player === 1) {
      switch (input) {
        case Inputs.A:
          return 0;
        case Inputs.B:
          return 1;
        case Inputs.L:
          return 2;
        case Inputs.START:
          return 3;
        case Inputs.UP:
          return 6;
        case Inputs.DOWN:
          return 7;
          case Inputs.LEFT:
            return 8;
            case Inputs.RIGHT:
          return 9;
        default:
        return null;
      }
    } else {
      // Player 2
      switch (input) {
        case Inputs.A:
          return 10;
        case Inputs.B:
          return 11;
        case Inputs.L:
          return 12;
        case Inputs.START:
          return 13;
        case Inputs.UP:
          return 14;
        case Inputs.DOWN:
          return 15;
          case Inputs.LEFT:
            return 16;
            case Inputs.RIGHT:
          return 17;
        default:
        return null;
      }
    }
    
  }
}
