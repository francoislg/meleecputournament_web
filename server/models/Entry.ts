import { Document, model, Schema } from "mongoose";

const entry = new Schema(
  {
    name: String!,
    character: String!,
    userId: String,
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
  tournamentId: string | null;
}

export const EntryModel = model<IEntryModel & Document>(
  "Entry",
  entry
);
