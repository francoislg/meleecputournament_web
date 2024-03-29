import fetch from "node-fetch";
import { writeFile } from "fs/promises";

export const updateBots = async () => {
  try {
    const res = await fetch("https://api.twitchinsights.net/v1/bots/online");
    const {bots, _total} = await res.json();
    console.log(bots, _total);
    if (_total > 0) {
      const data = bots.map(([name, something, id]) => name);
      if (data.length > 0) {
        await writeFile("./onlinebots.json", JSON.stringify(data, null, 2));
      }
      return data;
    }
  } catch (err) {
    console.error("Could not update bots, but meh", err);
  }
};

updateBots().then(() => console.log("finished"));
