import { Document, model, Schema } from "mongoose";

const entry = new Schema(
  {
    name: String!,
    character: String!,
    userId: String,
    color: String,
    miiConfiguration: String,
    tournamentId: String,
  },
  {
    timestamps: true,
  }
);

export interface IEntryModel {
  // ID here is a bit of a hack. It's available on Document, but we also would like to use it when we aggregate and need this ID.
  id: string;
  name: string;
  character: string;
  color?: number;
  miiConfiguration?: string;
  userId?: string;
  tournamentId: string | null;
}

export const EntryModel = model<IEntryModel & Document>(
  "Entry",
  entry
);
