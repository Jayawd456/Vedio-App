document.addEventListener("DOMContentLoaded", () => {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const joinRoomBtn = document.getElementById('joinRoom');
    const endCallBtn = document.getElementById('endCall');
    const roomIdInput = document.getElementById('roomId');
    const roomDisplay = document.getElementById('roomDisplay');

    const socket = io();
    let peerConnection;
    let localStream;
    let roomId;

    const config = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    function generateRoomId() {
        return Math.random().toString(36).substring(2, 8);
    }

    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('room') || generateRoomId();
    roomIdInput.value = roomId;
    roomDisplay.innerHTML = `🔗 Your Room ID: <strong>${roomId}</strong> (Share this with others)`;

    async function startCamera() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
        } catch (error) {
            console.error("🚨 Error accessing camera/microphone:", error);
            alert("Please allow camera and microphone access!");
        }
    }

    function createPeerConnection() {
        peerConnection = new RTCPeerConnection(config);

        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, roomId });
            }
        };

        if (localStream) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }
    }

    joinRoomBtn.onclick = async () => {
        roomId = roomIdInput.value.trim();
        if (!roomId) {
            alert("Please enter a Room ID");
            return;
        }
        await startCamera();
        if (!localStream) {
            alert("⚠️ Camera/Mic access required!");
            return;
        }
        createPeerConnection();
        socket.emit('join-room', roomId);
    };

    endCallBtn.onclick = () => {
        if (peerConnection) peerConnection.close();
        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
        alert("Call ended");
    };

    socket.on('user-connected', async () => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { offer, roomId });
    });

    socket.on('offer', async ({ offer }) => {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer, roomId });
    });

    socket.on('answer', async ({ answer }) => {
        await peerConnection.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
        await peerConnection.addIceCandidate(candidate);
    });
});
