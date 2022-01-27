import { EntryModel } from "../models/Entry";
import { connectToMongo } from "../Mongo";
import { twoNextEntries } from "../singlematches-commands";

async function test() {
  const mongo = await connectToMongo();
  try {
    //console.log(await getPossibleEntries());
    //console.log(await twoNextEntries());
    await EntryModel.updateMany({character: "Little Mac"}, {character: "LittleMac"})
    console.log("Finished");
  } finally {
    await mongo.disconnect();
  }
}

test().catch((error) => console.error(error));
