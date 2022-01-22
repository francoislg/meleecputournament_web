export const tryParseNumber = (color?: number | string) => {
  try {
    if (!color) return null;
    return typeof color === "number" ? color : parseInt(color);
  } catch {
    return null;
  }
};
