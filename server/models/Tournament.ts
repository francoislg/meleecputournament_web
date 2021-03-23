import { Document, model, Schema } from "mongoose";

const tournamentSchema = new Schema(
  {
    tournamentId: String,
    inProgress: Boolean
  },
  {
    timestamps: true,
  }
);

export interface ITournamentModel {
  tournamentId: string;
  inProgress: boolean;
}

export const TournamentModel = model<ITournamentModel & Document>(
  "Tournament",
  tournamentSchema
);
