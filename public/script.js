document.addEventListener("DOMContentLoaded", () => {
    const socket = io("https://vedio-app-k92u.onrender.com");

    let localStream;
    let peerConnections = {};
    const roomId = "myRoom";
    const videoGrid = document.getElementById("video-grid");

    async function startCamera() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            addVideoStream("local", localStream);
            socket.emit("join-room", roomId, socket.id);
        } catch (error) {
            console.error("Error accessing camera/microphone:", error);
            alert("Failed to access camera/microphone. Please check permissions.");
        }
    }

    function addVideoStream(id, stream) {
        let existingVideo = document.getElementById(id);
        if (existingVideo) return; // Prevent duplicate videos

        let video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute("id", id);

        video.onloadedmetadata = () => {
            video.play().catch(error => console.error("Video play error:", error));
        };

        videoGrid.appendChild(video);
    }

    function connectToNewUser(userId) {
        if (peerConnections[userId]) return;

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerConnections[userId] = peerConnection;

        // ✅ Fix: Ensure local tracks are correctly added
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // ✅ Fix: Ensure remote track gets added correctly
        peerConnection.ontrack = (event) => {
            if (!document.getElementById(userId)) {
                addVideoStream(userId, event.streams[0]);
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("candidate", roomId, event.candidate, socket.id);
            }
        };

        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                socket.emit("offer", roomId, peerConnection.localDescription, socket.id);
            });
    }

    socket.on("user-connected", (userId) => connectToNewUser(userId));

    socket.on("offer", (offer, userId) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerConnections[userId] = peerConnection;

        // ✅ Fix: Ensure local tracks are correctly added
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // ✅ Fix: Add remote track properly
        peerConnection.ontrack = (event) => {
            addVideoStream(userId, event.streams[0]);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("candidate", roomId, event.candidate, userId);
            }
        };

        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => peerConnection.createAnswer())
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit("answer", roomId, peerConnection.localDescription, userId);
            });
    });

    socket.on("answer", (answer, userId) => {
        peerConnections[userId]?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", (candidate, userId) => {
        if (peerConnections[userId] && peerConnections[userId].remoteDescription) {
            peerConnections[userId].addIceCandidate(new RTCIceCandidate(candidate))
                .catch(error => console.error("Error adding ICE candidate:", error));
        }
    });

    socket.on("user-disconnected", (userId) => {
        if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
            document.getElementById(userId)?.remove();
        }
    });

    startCamera();
});
