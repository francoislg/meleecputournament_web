import { SerialPort } from 'serialport';
import { Inputs, LowLevelController } from './controller';

export class SerialController implements LowLevelController {
  constructor(private port: SerialPort, private player: number) {
    if (player > 2) {
      throw new Error('This protocol only supports 2 players.');
    }
    this.port.write("r\n");
  }

  free() {
    if (this.port.isOpen) {
      this.releaseAll();
    }
  }

  hold(input: Inputs): this {
    this.send([input], true);
    return this;
  }

  release(input: Inputs): this {
    this.send([input], false);
    return this;
  }

  releaseAll(): this {
    this.send([
      Inputs.A,
      Inputs.B,
      Inputs.L,
      Inputs.R,
      Inputs.START,
      Inputs.UP,
      Inputs.DOWN,
      Inputs.LEFT,
      Inputs.RIGHT,
    ], false);
    return this;
  }

  private send(buttons: Inputs[], on: boolean) {
    const commands = buttons
      .map((button) => this.buttonToId(button))
      .filter(b => b !== null)
      .map((id) => `${id}${on ? '+' : '-'}`);
      this.port.write(commands.join(",") + "\n")
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
          // TODO: Workaround for now, it seems to work with this one
          return 13;
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
