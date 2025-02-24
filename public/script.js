document.addEventListener("DOMContentLoaded", () => {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const joinRoomBtn = document.getElementById('joinRoom');
    const endCallBtn = document.getElementById('endCall');
    const roomIdInput = document.getElementById('roomId');
    const roomDisplay = document.getElementById('roomDisplay');

    const socket = io();
let localStream;
let remoteStream;
let peerConnection;

const videoConstraints = { video: true, audio: true };
const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

 localVideo = document.getElementById("localVideo");
 remoteVideo = document.getElementById("remoteVideo");

// 🔹 Start Camera and Microphone
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        localVideo.srcObject = localStream;
        socket.emit("join-room"); // Notify server when ready
    } catch (error) {
        console.error("🚨 Error accessing camera/microphone:", error);
        alert("⚠️ Please allow camera and microphone access!");
    }
}

// 🔹 Handle Incoming Call Request
socket.on("offer", async (offer) => {
    peerConnection = new RTCPeerConnection(config);
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit("answer", answer);
});

// 🔹 Handle Incoming Answer
socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// 🔹 Handle ICE Candidates
socket.on("candidate", (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("connect", startCamera);

});
