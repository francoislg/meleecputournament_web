export const POINTS = {
  WIN: 20,
  TOURNAMENT_WIN: 1000,
  COST_TO_CUSTOM_MATCH: 100,
}

export const CHARACTERS = [
  "Mario",
  "DonkeyKong",
  "Link",
  "Samus",
  "DarkSamus",
  "Yoshi",
  "Kirby",
  "Fox",
  "Pikachu",
  "Luigi",
  "Ness",
  "CaptainFalcon",
  "Jigglypuff",
  "Peach",
  "Daisy",
  "Bowser",
  "IceClimbers",
  "Sheik",
  "Zelda",
  "DrMario",
  "Pichu",
  "Falco",
  "Marth",
  "Lucina",
  "YoungLink",
  "Ganondorf",
  "Mewtwo",
  "Roy",
  "Chrom",
  "GameAndWatch",
  "MetaKnight",
  "Pit",
  "DarkPit",
  "ZeroSuitSamus",
  "Wario",
  "Snake",
  "Ike",
  "PokemonTrainer",
  "DiddyKong",
  "Lucas",
  "Sonic",
  "KingDeDeDe",
  "Olimar",
  "Lucario",
  "ROB",
  "ToonLink",
  "Wolf",
  "Villager",
  "MegaMan",
  "WiiFitTrainer",
  "Rosalina",
  "LittleMac",
  "Greninja",
  "Palutena",
  "Pac-Man",
  "Robin",
  "Shulk",
  "BowserJr",
  "DuckHunt",
  "Ryu",
  "Ken",
  "Cloud",
  "Corrin",
  "Bayonetta",
  "Inkling",
  "Ridley",
  "Simon",
  "Richter",
  "KRool",
  "Isabelle",
  "Incineroar",
  "PiranhaPlant",
  "Joker",
  "Hero",
  "BanjoKazooie",
  "Terry",
  "Byleth",
  "MinMin",
  "Steve",
  "Sephiroth",
  "Pyra",
  "Kazuya",
  "Sora",
  "MiiBrawler", 
  "MiiSword", 
  "MiiGunner"
] as const;

type AllCharacters = typeof CHARACTERS[number];

export const getMiiConfiguration = (character: AllCharacters) => {
  if (character === 'MiiBrawler') {
    return '2221'
  } else if (character === 'MiiGunner') {
    return '1311'
  } else if (character === 'MiiSword') {
    return '1111'
  } else {
    return null;
  }
}

interface CharDef {
  aliases?: string[];
  syllables?: string[];
}

const characterDefs: Record<AllCharacters, CharDef> = {
  BanjoKazooie: {
    aliases: ["Banjo Kazooie", "Banjo"],
  },
  Bayonetta: {},
  Bowser: {},
  BowserJr: {
    aliases: ["Bowser Jr"],
  },
  Byleth: {},
  CaptainFalcon: {
    aliases: ["Captain Falcon", "Falcon Punch"],
  },
  Chrom: {},
  Cloud: {},
  Corrin: {},
  Daisy: {},
  DarkPit: {
    aliases: ["Dark Pit", "Pitoo"],
  },
  DarkSamus: {
    aliases: ["Dark Samus"],
  },
  DiddyKong: {
    aliases: ["Diddy Kong"],
  },
  DonkeyKong: {
    aliases: ["Donkey Kong"],
  },
  DrMario: {
    aliases: ["Dr. Mario"],
  },
  DuckHunt: {
    aliases: ["Duck Hunt"],
  },
  Falco: {},
  Fox: {},
  GameAndWatch: {
    aliases: ["Game & Watch"],
  },
  Ganondorf: {},
  Greninja: {},
  Hero: {},
  IceClimbers: {
    aliases: ["Ice Climbers"],
  },
  Ike: {},
  Incineroar: {},
  Inkling: {},
  Isabelle: {},
  Jigglypuff: {
    aliases: ["Jigglypuff", "Puff"],
  },
  Joker: {},
  Kazuya: {},
  KRool: {
    aliases: ["King K. Rool", "K. Rool"],
  },
  Ken: {},
  KingDeDeDe: {
    aliases: ["King DeDeDe", "DDD"],
  },
  Kirby: {},
  Link: {
    aliases: ["Link", "Lonk"],
  },
  LittleMac: {
    aliases: ["Little Mac", "Mac"],
  },
  Lucario: {},
  Lucas: {},
  Lucina: {},
  Luigi: {},
  Mario: {},
  Marth: {},
  MegaMan: {},
  MetaKnight: {
    aliases: ["Meta Knight", "MK"],
  },
  Mewtwo: {},
  MiiBrawler: {
    aliases: ["Mii Brawler"]
  },
  MiiSword: {
    aliases: ["Mii Swordfighter"]
  },
  MiiGunner: {
    aliases: ["Mii Gunner"]
  },
  MinMin: {
    aliases: ["Min Min"],
  },
  Ness: {
    aliases: ["Ness", "PK Fire"]
  },
  Olimar: {},
  "Pac-Man": {
    aliases: ["Pac-Man", "Wacko Wacko"]
  },
  Palutena: {},
  Peach: {aliases: ["Peach", "🍑"]},
  Pichu: {
    aliases: ["Pichu", "Chuuuu"]
  },
  Pikachu: {
    aliases: ["Pika", "Pikachu", "Pikapika"]
  },
  PiranhaPlant: {
    aliases: ["Piranha Plant"],
  },
  Pit: {},
  PokemonTrainer: {
    aliases: ["Pokémon Trainer"],
  },
  Pyra: {
    aliases: ["Mythra", "Pyra"],
  },
  ROB: {},
  Richter: {},
  Ridley: {},
  Robin: {},
  Rosalina: {
    aliases: ["Rosalina", "Rosalina and Luma"],
  },
  Roy: {},
  Ryu: {},
  Samus: {},
  Sephiroth: {},
  Sheik: {},
  Shulk: {},
  Simon: {},
  Snake: {},
  Sonic: {
    aliases: ["Sonic", "Sanic"],
  },
  Sora: {},
  Steve: {},
  Terry: {},
  ToonLink: {
    aliases: ["Toon Link", "Toon Lonk"],
  },
  Villager: {},
  Wario: {},
  WiiFitTrainer: {
    aliases: ["Wii Fit Trainer"],
  },
  Wolf: {},
  Yoshi: {},
  YoungLink: {
    aliases: ["Young Link", "Young Lonk"],
  },
  Zelda: {},
  ZeroSuitSamus: {
    aliases: ["Zero Suit Samus"],
  },
};

function randomFromList<T>(list: readonly T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export const randomCharacter = () => randomFromList(CHARACTERS);

import * as commonAdjectives from "./adjectives.json";

const prefixes = [
  ...commonAdjectives.map(a => a + " "),
  "Mr ",
  "Ms ",
  "Best ",
  "Worst ",
  "Accurate ",
  "Blind ",
  "Brutal ",
  "Mc",
  "Freezing ",
  "Cold ",
  "Hot ",
  "Fake ",
  "Free ",
  "Huge ",
  "Small ",
  "Insane ",
  "Mango's ",
  "Obsolete ",
  "Pink Gold ",
  "Metal ",
  "Solid ",
  "Gray ",
  "Red ",
  "Green ",
  "Invisible ",
  "Deadly ",
  "Wild ",
  "A Wild"
];
const suffixes = [
  " McFace",
  " #1",
  "-ish",
  "er",
  " the Last",
  " the First",
  " Champion",
  "ball",
  " the Wise",
  " the Clone",
  " and a Half",
  "fluff",
  " of Light",
  " of Darkness",
  " From the Future",
  "est",
  " of the Week",
  " de la Muerte",
  " and the Beast",
  " the Giant",
  ", of course",
  " Jr",
  " of the Wild",
  " of Nature",
  " of the Family"
];

export const generateName = (character: string) => {
  const { aliases = [character] } = characterDefs[character as AllCharacters];
  let name = randomFromList(aliases);
  if (Math.random() < 0.7) {
    name = randomFromList(prefixes) + name;
  }
  if (Math.random() < 0.05) {
    name = randomFromList(prefixes) + name;
  }
  if (Math.random() < 0.2) {
    name = name + "y";
  }
  if (Math.random() < 0.6) {
    name = name + randomFromList(suffixes);
  }
  return name;
};
