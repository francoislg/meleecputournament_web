/*export const CHARACTERS = [
  "CaptainFalcon",
  "DK",
  "Fox",
  "Kirby",
  "Bowser",
  "Link",
  "Mario",
  "Ness",
  "Pikachu",
  "IceClimbers",
  "Zelda",
  "Yoshi",
  "Samus",
  "Peach",
  "GameAndWatch",
  "DrMario",
  "Luigi",
  "Jigglypuff",
  "Mewtwo",
  "Marth",
  "Ganondorf",
  "YoungLink",
  "Falco",
  "Pichu",
  "Roy",
  // Doesn't quite work yet, "Shiek",
];*/

export const CHARACTERS = [
  "Mario", "DonkeyKong", "Link", "Samus", "DarkSamus", "Yoshi", "Kirby", "Fox", "Pikachu", "Luigi", "Ness", "CaptainFalcon",
  "Jigglypuff", "Peach", "Daisy", "Bowser", "IceClimbers", "Shiek", "Zelda", "DrMario", "Pichu", "Falco", "Marth", "Lucina",
  "YoungLink", "Ganondorf", "Mewtwo", "Roy", "Chrom", "GameAndWatch", "MetaKnight", "Pit", "DarkPit", "ZeroSuitSamus", "Wario", "Snake",
  "Ike", "PokemonTrainer", "DiddyKong", "Lucas", "Sonic", "KingDeDeDe", "Olimar", "Lucario", "ROB", "ToonLink", "Wolf", "Villager",
  "MegaMan", "WiiFitTrainer", "Rosalina", "LittleMac", "Greninja", "Palutena", "Pac-Man", "Robin", "Shulk", "BowserJr", "DuckHunt", "Ryu",
  "Ken", "Cloud", "Corrin", "Bayonetta", "Inkling", "Ridley", "Simon", "Richter", "KRool", "Isabelle", "Incineroar", "PiranhaPlant",
  "Joker", "Hero", "BanjoKazooie", "Terry", "Byleth", "MinMin", "Steve", "Sephiroth", "Pyra"
];

export const randomCharacter = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];