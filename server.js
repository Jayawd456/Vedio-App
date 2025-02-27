const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static("public"));

const usersInRoom = {}; 

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    socket.on("join-room", (roomId, userId) => {
        if (!usersInRoom[roomId]) {
            usersInRoom[roomId] = [];
        }
        usersInRoom[roomId].push(userId);
        socket.join(roomId);

        socket.emit("all-users", usersInRoom[roomId]);
        io.to(roomId).emit("user-connected", userId);

        socket.on("disconnect", () => {
            usersInRoom[roomId] = usersInRoom[roomId].filter(id => id !== userId);
            io.to(roomId).emit("user-disconnected", userId);
        });
    });

    socket.on("offer", (roomId, offer, userId) => {
        socket.broadcast.to(roomId).emit("offer", offer, userId);
    });

    socket.on("answer", (roomId, answer, userId) => {
        socket.broadcast.to(roomId).emit("answer", answer, userId);
    });

    socket.on("candidate", (roomId, candidate, userId) => {
        socket.broadcast.to(roomId).emit("candidate", candidate, userId);
    });

    socket.on("chat-message", (roomId, message) => {
        socket.broadcast.to(roomId).emit("chat-message", "User", message);
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
