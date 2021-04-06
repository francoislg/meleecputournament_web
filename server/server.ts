import { Socket, Server } from "socket.io";
import { ChatServer } from "./chat-server";
import { connectToMongo } from "./Mongo";
import { OverlayServer } from "./overlay-server";
import { PCServer } from "./pc-server";

// Must match the PC.
const SECRET_PC_KEY = "zunHp5gte9kBVUiqzXYw33eN3po78L";
// Must match overlay
const SECRET_OVERLAY_KEY = "yrxbJYtE4KbYX6Ci2RQGpSKBur7Ubh";

connectToMongo().then(() => {
  const overlayServer = new OverlayServer();
  new ChatServer(overlayServer);
  const pcServer = new PCServer(overlayServer);

  const server = new Server(8080, {
    cors: {
      origin: "*",
    }
  });

  server.on("connect", (socket: Socket) => {
    console.log(`connect ${socket.id}`);

    socket.on("iamtheserver", async (key, reconnecting) => {
      if (key !== SECRET_PC_KEY) {
        throw new Error("Could not connect");
      }

      console.log(`Server ${reconnecting ? "reconnecting" : "connected"}`);

      await pcServer.connect(socket, {reconnecting});
    });

    socket.on("iamtheoverlay", async (key) => {
      if (key !== SECRET_OVERLAY_KEY) {
        throw new Error("Could not connect");
      }

      console.log(`Overlay connected`);
      
      try {
        await overlayServer.connect(socket);
      } catch (error) {
        console.error(error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`disconnect ${socket.id}`);
    });
  });
});
