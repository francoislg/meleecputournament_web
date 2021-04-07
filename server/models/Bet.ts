import { Document, model, Schema } from "mongoose";

const bet = new Schema(
  {
    userId: String,
    bet: Number,
    player: Number,
    tournamentId: String,
    matchId: Number,
  },
  {
    timestamps: true,
  }
);

export interface IBetModel {
  userId: string;
  bet: number;
  player: number;
  tournamentId: string;
  matchId: number;
}

export const BetModel = model<IBetModel & Document>(
  "Bet",
  bet
);
