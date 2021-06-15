import { createWriteStream } from "fs";

const stream = createWriteStream("./server-logs.log", { flags: "a" });

export const importantLog = (...message: string[]) => {
  try {
    stream.write(`${new Date().toISOString}: ${message.join("\n")}\n`);
  } catch (error) {
    console.error("ERROR WHILE TRYING TO WRITE IN LOG, will ignore", error);
  }
};
