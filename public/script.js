const socket = io("https://vedio-app-k92u.onrender.com"); // Replace with your deployed server URL

let localStream;
let peerConnections = {};
const videoGrid = document.getElementById("video-grid");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const roomId = "myRoom"; // Static room

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Start Camera
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addVideoStream("local", localStream);
        socket.emit("join-room", roomId);
    } catch (error) {
        console.error("Error accessing camera/microphone:", error);
    }
}

function addVideoStream(id, stream) {
    let video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.setAttribute("id", id);
    videoGrid.appendChild(video);
}

socket.on("user-connected", (userId) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;
    
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    
    peerConnection.ontrack = (event) => {
        addVideoStream(userId, event.streams[0]);
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

socket.on("offer", (offer, userId) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;
    
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    
    peerConnection.ontrack = (event) => {
        addVideoStream(userId, event.streams[0]);
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

socket.on("answer", (answer, userId) => {
    peerConnections[userId].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", (candidate, userId) => {
    peerConnections[userId].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("user-disconnected", (userId) => {
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
        document.getElementById(userId)?.remove();
    }
});

// Chat Feature
sendButton.onclick = () => {
    const message = chatInput.value;
    socket.emit("chat-message", roomId, message);
    addChatMessage("You", message);
    chatInput.value = "";
};

socket.on("chat-message", (user, message) => {
    addChatMessage(user, message);
});

function addChatMessage(user, message) {
    let msgElement = document.createElement("p");
    msgElement.innerHTML = `<strong>${user}:</strong> ${message}`;
    chatBox.appendChild(msgElement);
}

startCamera();
