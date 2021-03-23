import { Socket, Server } from "socket.io";
import { ChatServer } from "./chat-server";
import { connectToMongo } from "./Mongo";
import { PCServer } from "./pc-server";

// Must match the PC.
const SECRET_PC_KEY = "zunHp5gte9kBVUiqzXYw33eN3po78L";

connectToMongo().then(() => {
  new ChatServer();

  const server = new Server(8080);

  server.on("connect", (socket: Socket) => {
    console.log(`connect ${socket.id}`);

    socket.on("iamtheserver", (key, reconnecting) => {
      if (key !== SECRET_PC_KEY) {
        throw new Error("Could not connect");
      }

      console.log(`Server ${reconnecting ? "reconnecting" : "connected"}`);

      new PCServer(socket, {reconnecting});
    });

    socket.on("disconnect", () => {
      console.log(`disconnect ${socket.id}`);
    });
  });
});
