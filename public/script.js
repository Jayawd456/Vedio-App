const socket = io("https://vedio-app-k92u.onrender.com"); // Your server URL

let localStream;
let peerConnections = {};

const MAX_USERS = 4; // Limit to 4 users
const videoGrid = document.getElementById("video-grid");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");

// Call Controls
const toggleMicBtn = document.getElementById("toggleMic");
const toggleVideoBtn = document.getElementById("toggleVideo");
const endCallBtn = document.getElementById("endCall");

const roomId = "myRoom";

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com" }
    ]
};

// Start Camera & Join Room
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addVideoStream("local", localStream);
        socket.emit("join-room", roomId);
    } catch (error) {
        console.error("Error accessing camera/microphone:", error);
        alert("Failed to access camera/microphone. Please check permissions.");
    }
}

// Add Video Stream
function addVideoStream(id, stream) {
    if (!document.getElementById(id)) {
        let video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.setAttribute("id", id);
        videoGrid.appendChild(video);
    }
}

// Handle User Connection
socket.on("user-connected", (userId) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

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

// Handle Offer
socket.on("offer", (offer, userId) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

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

// Handle Answer
socket.on("answer", (answer, userId) => {
    peerConnections[userId]?.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle ICE Candidates
socket.on("candidate", (candidate, userId) => {
    peerConnections[userId]?.addIceCandidate(new RTCIceCandidate(candidate));
});

// Handle User Disconnect
socket.on("user-disconnected", (userId) => {
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
        document.getElementById(userId)?.remove();
    }
});

// Toggle Mic
toggleMicBtn.onclick = () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    toggleMicBtn.innerHTML = audioTrack.enabled ? "Mute" : "Unmute";
};

// Toggle Video
toggleVideoBtn.onclick = () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    toggleVideoBtn.innerHTML = videoTrack.enabled ? "Stop Video" : "Start Video";
};

// End Call
endCallBtn.onclick = () => {
    Object.values(peerConnections).forEach(pc => pc.close());
    socket.disconnect();
    videoGrid.innerHTML = "";
};

// Chat Feature
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

// Display Chat Messages
function addChatMessage(user, message) {
    let msgElement = document.createElement("p");
    msgElement.innerHTML = `<strong>${user}:</strong> ${message}`;
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

startCamera();
