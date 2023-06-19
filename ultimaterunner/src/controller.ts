export enum Inputs {
  A,
  B,
  START,
  L,
  R,
  /*POV_NIL,
  POV_UP,
  POV_RIGHT,
  POV_DOWN,
  POV_LEFT,*/
  UP,
  RIGHT,
  DOWN,
  LEFT,
}

/** Low-Level controller interface to press buttons. Implemented by Serial or vJoy */
export interface Controller {
  press(input: Inputs): this;
  hold(input: Inputs): this;
  forMilliseconds(ms: number): this;
  and(): this;
  execute(): Promise<this>;
  andThen(): this;
  wait(ms: number): this;
}

export interface LowLevelController {
  hold(input: Inputs): this;
  release(input: Inputs): this;
  releaseAll(): this;
  free(): void;
}

interface Command {
  execute: () => Promise<any>;
}

/**
 * The "async" version allow sending commands, then "execute()" then all sequentially.
 * Very useful to set up a command queue with multiple controllers and execute both at the same time.
 */
export class AsyncController implements Controller {
  private pressTime = 100;
  private timeBetweenCommands = 20;

  private currentInputGroup: Inputs[] = [];
  private currentCommandGroup: Command[] = [];
  private commandsToExecute: Command[] = [];

  constructor(private llc: LowLevelController) {
    this.llc.releaseAll();
  }
  press(input: Inputs): this {
    this.hold(input).forMilliseconds(this.pressTime);
    return this;
  }
  hold(input: Inputs) {
    this.currentInputGroup.push(input);
    return this;
  }
  forMilliseconds(ms: number): this {
    this.queueCommandForCurrentInputs(ms);
    return this;
  }
  and(): this {
    return this;
  }
  async execute(): Promise<this> {
    this.queueCommandForCurrentInputs();
    this.regroupAllCurrentCommandsConcurrently();

    for (let command of this.commandsToExecute) {
      await command.execute();
    }

    this.commandsToExecute = [];

    return this;
  }
  andThen(): this {
    this.queueCommandForCurrentInputs();
    this.regroupAllCurrentCommandsConcurrently();
    this.commandsToExecute.push(WaitCommand(this.timeBetweenCommands));
    return this;
  }
  wait(ms: number): this {
    this.currentCommandGroup.push(WaitCommand(ms));
    return this;
  }

  // Used to be "clearCurrentButtons"
  private queueCommandForCurrentInputs(ms: number = this.pressTime) {
    if (this.currentInputGroup.length > 0) {
      this.currentCommandGroup.push(InputsGroupCommand(this.llc, this.currentInputGroup, ms));
      this.currentInputGroup = [];
    }
  }

  private regroupAllCurrentCommandsConcurrently() {
    this.commandsToExecute.push(ConcurrentCommands(this.currentCommandGroup));
    this.currentCommandGroup = [];
  }
}

const WaitCommand = (ms: number): Command => {
  return {
    execute: async () => waitUntil(ms),
  };
};

const InputsGroupCommand = (
  controller: LowLevelController,
  inputs: Inputs[],
  holdTimeInMs: number
): Command => {
  return {
    execute: async () => {
      await Promise.all(inputs.map((input) => controller.hold(input)));
      await waitUntil(holdTimeInMs);
      await Promise.all(inputs.map((input) => controller.release(input)));
    },
  };
};

const ConcurrentCommands = (commands: Command[]): Command => {
  return {
    execute: async () => {
      await Promise.all(commands.map((command) => command.execute()));
    },
  };
};

const waitUntil = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
