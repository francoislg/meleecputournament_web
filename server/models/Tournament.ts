import { Document, model, Schema } from "mongoose";

const tournamentSchema = new Schema(
  {
    tournamentId: String,
    inProgress: Boolean,
    winnerId: String,
  },
  {
    timestamps: true,
  }
);

export interface ITournamentModel {
  tournamentId: string;
  inProgress: boolean;
  winnerId?: string;
}

export const TournamentModel = model<ITournamentModel & Document>(
  "Tournament",
  tournamentSchema
);
