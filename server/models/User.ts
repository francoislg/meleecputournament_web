import { Document, model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    twitchId: String!,
    twitchUsername: String!,
    points: Number!,
  },
  {
    timestamps: true,
  }
);

export interface IUserModel {
  twitchId: string;
  twitchUsername: string;
  points: number;
}

export const UserModel = model<IUserModel & Document>("User", userSchema);
