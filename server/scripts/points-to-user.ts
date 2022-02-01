import { connectToMongo } from "../Mongo";
import { givePointsToUser } from "../singlematches-commands";

const USERID = "";
const POINTS = 0;

async function run() {
    const mongo = await connectToMongo();
    await givePointsToUser(USERID, POINTS).catch(err => console.error(err));
    mongo.disconnect();
}

run();