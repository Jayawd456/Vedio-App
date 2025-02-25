const socket = io("https://vedio-app-k92u.onrender.com"); // Replace with your deployed server URL

let localStream;
let peerConnections = {};
const localVideo = document.getElementById("mainVideo");
const videoGrid = document.querySelector(".participant-videos");
const chatBox = document.querySelector(".chat-section");
const chatInput = document.querySelector("#chatInput");
const sendButton = document.querySelector("#sendButton");
const participantsList = document.querySelector(".participants-list");
const roomId = "myRoom"; // Static room ID

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },  // Free STUN servers
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        {
            urls: "turn:your.turn.server", // Replace with a TURN server for full global support
            username: "username",
            credential: "password"
        }
    ]
};

// 🔹 Start User Camera & Join Room
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addVideoStream("local", localStream, "You");
        socket.emit("join-room", roomId);
    } catch (error) {
        console.error("Error accessing camera/microphone:", error);
    }
}

// 🔹 Add Video Stream to UI
function addVideoStream(id, stream, name) {
    let videoContainer = document.createElement("div");
    videoContainer.classList.add("participant");
    videoContainer.setAttribute("id", id);

    let video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    videoContainer.appendChild(video);

    let label = document.createElement("div");
    label.classList.add("video-label");
    label.innerText = name;
    videoContainer.appendChild(label);

    videoGrid.appendChild(videoContainer);
}

// 🔹 Handle New User Connection
socket.on("user-connected", (userId) => {
    console.log("New user joined:", userId);
    updateParticipants(userId, "add");

    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        addVideoStream(userId, event.streams[0], `User ${userId}`);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", roomId, event.candidate);
        }
    };

    peerConnection.createOffer().then((offer) => {
        return peerConnection.setLocalDescription(offer);
    }).then(() => {
        socket.emit("offer", roomId, peerConnection.localDescription);
    });
});

// 🔹 Handle Offer from Peers
socket.on("offer", (offer, userId) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        addVideoStream(userId, event.streams[0], `User ${userId}`);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", roomId, event.candidate);
        }
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(() => {
        return peerConnection.createAnswer();
    }).then((answer) => {
        return peerConnection.setLocalDescription(answer);
    }).then(() => {
        socket.emit("answer", roomId, peerConnection.localDescription);
    });
});

// 🔹 Handle Answer from Peers
socket.on("answer", (answer, userId) => {
    peerConnections[userId].setRemoteDescription(new RTCSessionDescription(answer));
});

// 🔹 Handle ICE Candidates
socket.on("candidate", (candidate, userId) => {
    peerConnections[userId].addIceCandidate(new RTCIceCandidate(candidate));
});

// 🔹 Handle User Disconnection
socket.on("user-disconnected", (userId) => {
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
        document.getElementById(userId)?.remove();
    }
    updateParticipants(userId, "remove");
});

// 🔹 Chat Feature
sendButton.onclick = () => {
    const message = chatInput.value;
    if (message.trim() !== "") {
        socket.emit("chat-message", roomId, message);
        addChatMessage("You", message);
        chatInput.value = "";
    }
};

socket.on("chat-message", (user, message) => {
    addChatMessage(user, message);
});

function addChatMessage(user, message) {
    let msgElement = document.createElement("div");
    msgElement.classList.add("chat-message");
    msgElement.innerHTML = `<strong>${user}:</strong> ${message}`;
    chatBox.appendChild(msgElement);
}

// 🔹 Update Participants List
function updateParticipants(userId, action) {
    if (action === "add") {
        let participant = document.createElement("div");
        participant.classList.add("participant-name");
        participant.innerText = `User ${userId}`;
        participant.setAttribute("id", `participant-${userId}`);
        participantsList.appendChild(participant);
    } else if (action === "remove") {
        document.getElementById(`participant-${userId}`)?.remove();
    }
}

// Start Camera & Join Room
startCamera();
