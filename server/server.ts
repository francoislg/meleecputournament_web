import {Socket, Server} from "socket.io";

const server = new Server(8080);

server.on("connect", (socket: Socket) => {
    console.log(`connect ${socket.id}`);

    socket.on("ping", (cb) => {
        console.log("ping");
    });

    socket.on("disconnect", () => {
        console.log(`disconnect ${socket.id}`);
    })
})