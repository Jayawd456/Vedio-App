const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } }); // Allow all connections

app.use(cors());
app.use(express.static("public"));

const MAX_USERS = 4; // Limit to 4 users per room
const usersInRoom = {}; // Track users in each room

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Check the current user count in the room before joining
    socket.on("check-user-count", (roomId) => {
        const count = usersInRoom[roomId]?.length || 0;
        socket.emit("user-count", count);
    });

    // Handle user joining the room
    socket.on("join-room", (roomId) => {
        if (!usersInRoom[roomId]) {
            usersInRoom[roomId] = [];
        }

        if (usersInRoom[roomId].length >= MAX_USERS) {
            socket.emit("room-full");
            return;
        }

        usersInRoom[roomId].push(socket.id);
        socket.join(roomId);
        io.to(roomId).emit("user-connected", socket.id);
        console.log(`User ${socket.id} joined room ${roomId}. Current users:`, usersInRoom[roomId]);

        // Notify users when someone leaves
        socket.on("disconnect", () => {
            usersInRoom[roomId] = usersInRoom[roomId].filter(id => id !== socket.id);
            io.to(roomId).emit("user-disconnected", socket.id);
            console.log(`User ${socket.id} left room ${roomId}. Remaining users:`, usersInRoom[roomId]);
        });
    });

    // Handle WebRTC signaling
    socket.on("offer", (roomId, offer) => {
        socket.broadcast.to(roomId).emit("offer", offer, socket.id);
    });

    socket.on("answer", (roomId, answer) => {
        socket.broadcast.to(roomId).emit("answer", answer, socket.id);
    });

    socket.on("candidate", (roomId, candidate) => {
        socket.broadcast.to(roomId).emit("candidate", candidate, socket.id);
    });

    // Handle chat messages
    socket.on("chat-message", (roomId, message) => {
        socket.broadcast.to(roomId).emit("chat-message", "User", message);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
