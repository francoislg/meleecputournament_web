import * as mongoose from "mongoose";

const MONGO_URL = process.env.AT_MONGO_URL;
if (!MONGO_URL) {
  throw new Error("Mongo URL not provided.");
}

export const connectToMongo = async () => {
  console.log("Logging into Mongo");
  await mongoose.connect(MONGO_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    bufferCommands: false,
    bufferMaxEntries: 0,
  });
  mongoose.connection.on("error", (err) => {
    console.error(err);
  });
  console.log("Finished logging into Mongo");
};