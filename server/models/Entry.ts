import { Document, model, Schema } from "mongoose";

const entry = new Schema(
  {
    name: String!,
    character: String!,
    userId: String,
    bet: Number,
    tournamentId: String,
  },
  {
    timestamps: true,
  }
);

export interface IEntryModel {
  name: string;
  character: string;
  userId?: string;
  bet?: number;
  tournamentId?: string;
}

export const EntryModel = model<IEntryModel & Document>(
  "Entry",
  entry
);
