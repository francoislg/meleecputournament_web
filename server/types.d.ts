export interface MatchResponseMessage {
  winner: PlayerMessageMeta;
  loser: PlayerMessageMeta;
  isWinnerFirstPlayer: boolean;
  matchId: number;
}

export interface MatchMessage {
  first: PlayerMessageMeta;
  second: PlayerMessageMeta;
  matchId: number;
  isCustomMatch: boolean;
  ruleset: SingleMatchRuleset;
}

export interface PlayerMessageMeta {
  id: string;
  name: string;
  character: string;
  color?: number;
  temporary?: boolean;
}

export type SingleMatchRuleset = "chaotic" | "fair" | "other";
