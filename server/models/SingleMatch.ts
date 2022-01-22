import { Document, model, Schema } from "mongoose";

const singleMatch = new Schema(
  {
    player1Id: String,
    player2Id: String,
    matchId: Number,
    started: Boolean,
    winner: Number,
    ruleset: String,
  },
  {
    timestamps: true,
  }
);

export interface ISingleMatchModel {
  player1Id: string;
  player2Id: string;
  matchId: number,
  started: boolean;
  winner: 0 | 1 | 2;
  ruleset: 'chaotic' | 'fair' | 'other'
}

export const SingleMatchModel = model<ISingleMatchModel & Document>(
  "SingleMatch",
  singleMatch
);
