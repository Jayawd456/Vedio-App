const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });  // Allow all connections

app.use(cors());  
app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("user-connected", socket.id);
    });

    socket.on("offer", (roomId, offer) => {
        socket.broadcast.to(roomId).emit("offer", offer, socket.id);
    });

    socket.on("answer", (roomId, answer) => {
        socket.broadcast.to(roomId).emit("answer", answer, socket.id);
    });

    socket.on("candidate", (roomId, candidate) => {
        socket.broadcast.to(roomId).emit("candidate", candidate, socket.id);
    });

    socket.on("chat-message", (roomId, message) => {
        socket.broadcast.to(roomId).emit("chat-message", "User", message);
    });

    socket.on("disconnect", () => {
        io.emit("user-disconnected", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
