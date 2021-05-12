import { VJoyController } from './vJoyController';
import { AsyncController, Inputs } from './controller';

const EMPTYSPOT = 'EMPTY';
const RANDOMSPOT = 'RANDOM';

// Most of the speed things were found by starting with some screenshot estimates, then manually adjusting until it felt somewhat right
const CONSTANTS = {
  // prettier-ignore
  characters: [
    "Mario", "DonkeyKong", "Link", "Samus", "DarkSamus", "Yoshi", "Kirby", "Fox", "Pikachu", "Luigi", "Ness", "CaptainFalcon",
    "Jigglypuff", "Peach", "Daisy", "Bowser", "IceClimbers", "Shiek", "Zelda", "DrMario", "Pichu", "Falco", "Marth", "Lucina",
    "YoungLink", "Ganondorf", "Mewtwo", "Roy", "Chrom", "GameAndWatch", "MetaKnight", "Pit", "DarkPit", "ZeroSuitSamus", "Wario", "Snake",
    "Ike", "PokemonTrainer", "DiddyKong", "Lucas", "Sonic", "KingDeDeDe", "Olimar", "Lucario", "ROB", "ToonLink", "Wolf", "Villager",
    "MegaMan", "WiiFitTrainer", "Rosalina", "LittleMac", "Greninja", "Palutena", "Pac-Man", "Robin", "Shulk", "BowserJr", "DuckHunt", "Ryu",
    "Ken", "Cloud", "Corrin", "Bayonetta", "Inkling", "Ridley", "Simon", "Richter", "KRool", "Isabelle", "Incineroar", "PiranhaPlant",
    EMPTYSPOT, "Joker", "Hero", "BanjoKazooie", "Terry", "Byleth", "MinMin", "Steve", "Sephiroth", "Pyra", RANDOMSPOT, EMPTYSPOT
  ],
  charactersPerRow: 12,
  characterBox: {
    w: 144,
    h: 80,
  },
  cssBounds: {
    x: 30,
    y: 30,
    width: 1728,
    height: 572,
  },
  cssCursorSpeedPer100Ms: {
    x: 390 / 5,
    y: 390 / 5, // ~450 on a 500ms scale.
    diagonalMultiplicator: 1.5, // found 275 distance when up+right.
  },
  bounds: {
    TOP: 0,
    BOTTOM: 1023,
    LEFT: 0,
    RIGHT: 1920,
  },
};

export const randomCharacter = () => {
  const rand = () => CONSTANTS.characters[Math.floor(Math.random() * CONSTANTS.characters.length)];
  let choice = RANDOMSPOT;
  while (choice === EMPTYSPOT || choice === RANDOMSPOT) {
    choice = rand();
  }
  return choice;
};

class CharacterCursor {
  constructor(private controller: AsyncController, private player: number) {}

  async calibrate() {
    await this.controller.hold(Inputs.DOWN).hold(Inputs.LEFT).forMilliseconds(3000).execute();
  }

  async setAsCPU() {
    await this.controller
      .hold(Inputs.RIGHT)
      .forMilliseconds(this.player * 600)
      .andThen()
      .press(Inputs.A)
      .execute();
  }

  async getToCharacter(character: string, color?: number) {
    // It looks like there are a couple of frames of start up for the controller, so the sane thing is to always calibrate them
    await Promise.all([this.controller.press(Inputs.B).execute(), this.calibrate()]);
    const { characters, charactersPerRow, cssBounds, characterBox } = CONSTANTS;
    const index = characters.indexOf(character);
    if (index < 0) {
      throw new Error(`${character} is invalid.`);
    }
    const rowNumber = Math.floor(index / charactersPerRow) + 1;
    const colNumber = (index % charactersPerRow) + 1;
    const x = cssBounds.x + colNumber * characterBox.w;
    const y = cssBounds.y + rowNumber * characterBox.h;
    console.log(
      `Player ${this.player} trying to get to ${character} (${index}, ${rowNumber}, ${colNumber}) on ${x},${y}`
    );
    await this.getTo(x, y);
    await this.controller.press(Inputs.A).andThen();
    const colorPresses = color ?? Math.random() * 8;
    for (let i = 0; i < colorPresses; i++) {
      this.controller.press(Inputs.L).andThen();
    }
    await this.controller.execute();
  }

  async getTo(targetX: number, targetY: number) {
    const distanceInMs = (position: number, target: number, speed: number) =>
      Math.abs(position - target) * (speed / 100);

    // Assume the cursor is always at the bottom right for now, since we don't account for the controller start up time.
    const {
      bounds: { LEFT: x, BOTTOM: y },
    } = CONSTANTS;

    const { cssCursorSpeedPer100Ms } = CONSTANTS;
    let timeX = distanceInMs(x, targetX, cssCursorSpeedPer100Ms.x);
    let timeY = distanceInMs(y, targetY, cssCursorSpeedPer100Ms.y);
    const diagonalDelta = timeX - timeY;

    // Multiply by some number.
    if (diagonalDelta != 0) {
      timeX *= cssCursorSpeedPer100Ms.diagonalMultiplicator;
      timeY *= cssCursorSpeedPer100Ms.diagonalMultiplicator;
    }

    // But remove the padding for the time the controller is *not* moving diagonally.
    if (diagonalDelta > 0) {
      timeX -= Math.abs(diagonalDelta * 0.5);
    } else if (diagonalDelta < 0) {
      timeY -= Math.abs(diagonalDelta * 0.5);
    }

    console.log('Will travel from', { x, y }, 'to', { targetX, targetY });

    if (x < targetX) {
      this.controller.hold(Inputs.RIGHT).forMilliseconds(Math.round(timeX));
    } else if (x > targetY) {
      this.controller.hold(Inputs.LEFT).forMilliseconds(Math.round(timeX));
    }

    if (y > targetY) {
      this.controller.hold(Inputs.UP).forMilliseconds(Math.round(timeY));
    } else if (y < targetY) {
      this.controller.hold(Inputs.DOWN).forMilliseconds(Math.round(timeY));
    }

    await this.controller.execute();
  }
}

export class SmashUltimateControllers {
  private player1CSSCursor: CharacterCursor;
  private player2CSSCursor: CharacterCursor;
  constructor(private player1: AsyncController, private player2: AsyncController) {
    this.player1CSSCursor = new CharacterCursor(player1, 1);
    this.player2CSSCursor = new CharacterCursor(player2, 2);
  }

  async startTheGame() {
    await this.player1.press(Inputs.A).execute();
    await waitFor(5000);
    await this.player1.press(Inputs.A).execute();
    await waitFor(5000);
  }

  async getToRuleSetFromStart() {
    await this.player1.press(Inputs.A).execute();
    await waitFor(1000);
    await this.player1.press(Inputs.A).execute();
    await waitFor(2000);
  }

  async selectDefaultRuleset() {
    await this.player1.press(Inputs.A).execute();
    await waitFor(3000);
  }

  async selectStage() {
    await this.player1.press(Inputs.A).execute();
    // Maybe test this with the image matcher
    await waitFor(7000);
  }

  async moveJustABitToRegisterAsPlayersInCSS() {
    await this.player1
      .hold(Inputs.DOWN)
      .forMilliseconds(300)
      .andThen()
      .hold(Inputs.UP)
      .forMilliseconds(300)
      .execute();
    await this.player2
      .hold(Inputs.DOWN)
      .forMilliseconds(300)
      .andThen()
      .hold(Inputs.UP)
      .forMilliseconds(300)
      .execute();
  }

  async resetControllersPosition() {
    await Promise.all([this.player1CSSCursor.calibrate(), this.player2CSSCursor.calibrate()]);
  }

  async setP1AsCPU() {
    await this.player1CSSCursor.calibrate();
    await this.player1CSSCursor.setAsCPU();
    await waitFor(500);
  }

  async setP2AsCPU() {
    await this.player2CSSCursor.calibrate();
    await this.player2CSSCursor.setAsCPU();
    await waitFor(500);
  }

  async setAsCPU() {
    await this.resetControllersPosition();
    await Promise.all([this.player1CSSCursor.setAsCPU(), this.player2CSSCursor.setAsCPU()]);
  }

  async justSelectCharacters(player1: string, player2: string) {
    await Promise.all([
      this.player1CSSCursor.getToCharacter(player1),
      this.player2CSSCursor.getToCharacter(player2),
    ]);
  }

  async startMatch() {
    await this.player1.press(Inputs.START).execute();
  }

  async selectCharactersAndStart(player1: string, player2: string) {
    await this.justSelectCharacters(player1, player2);
    await this.startMatch();
  }

  async pressAOnTheWinScreen() {
    await this.player1.press(Inputs.A).execute();
    await waitFor(2000);
  }

  async finishTheMatch() {
    await this.player1.press(Inputs.A).execute();
    await waitFor(2000);
    await this.player1.press(Inputs.A).execute();
    await waitFor(2000);
    await this.player1.press(Inputs.A).execute();
  }
}

export const withController = async (
  handle: (controller: SmashUltimateControllers) => Promise<void>
) => {
  let player1 = new VJoyController(1);
  let player2 = new VJoyController(2);
  try {
    player1.releaseAll();
    player2.releaseAll();

    const ult = new SmashUltimateControllers(
      new AsyncController(player1),
      new AsyncController(player2)
    );
    await handle(ult);
  } finally {
    if (player1) {
      player1.free();
    }
    if (player2) {
      player2.free();
    }
  }
};

export const setInputs = async () => {
  await setInputsForPlayer(1);
  console.log('Waiting between players');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await setInputsForPlayer(2);
};

const setInputsForPlayer = async (id: number) => {
  console.log(`Setting up player ${id}`);
  let player: VJoyController = new VJoyController(id);
  try {
    const controller = new AsyncController(player);
    console.log('Pressing A in 1 sec');
    await controller.wait(1000).andThen().press(Inputs.A).execute();
    console.log('Pressing B in 2 sec');
    await controller.wait(2000).andThen().press(Inputs.B).execute();
    console.log('Pressing L in 2 sec');
    await controller.wait(1000).andThen().press(Inputs.L).execute();
    console.log('Pressing R in 2 sec');
    await controller.wait(1000).andThen().press(Inputs.R).execute();
    console.log('Pressing Start in 2 sec');
    await controller.wait(2000).andThen().press(Inputs.START).execute();
    console.log('Pressing Left and Up in 2 sec');
    await controller.wait(2000).andThen().hold(Inputs.LEFT).forMilliseconds(500).execute();
    await controller.hold(Inputs.UP).forMilliseconds(500).execute();
  } finally {
    if (player) {
      player.free();
    }
  }
};

const waitFor = async (time: number) => new Promise((resolve) => setTimeout(resolve, time));
