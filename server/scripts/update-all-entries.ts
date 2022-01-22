import { SingleMatchModel } from "../models/SingleMatch";
import { connectToMongo } from "../Mongo";

async function updateMatches() {
    await connectToMongo();
    await SingleMatchModel.updateMany({
        ruleset: null
    }, {
        ruleset: 'other'
    });
    console.log("Finished");
}

updateMatches().catch(error => console.error(error));