export const CHARACTERS = [
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
];

export const randomCharacter = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];