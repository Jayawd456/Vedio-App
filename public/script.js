document.addEventListener("DOMContentLoaded", () => {
    const socket = io("https://vedio-app-k92u.onrender.com");
    
    let localStream;
    let screenStream = null;
    let peerConnections = {};
    const roomId = "myRoom";
    const videoGrid = document.getElementById("video-grid");
    const chatBox = document.getElementById("chatBox");
    const chatInput = document.getElementById("chatInput");
    const sendButton = document.getElementById("sendButton");
    
    const toggleMicBtn = document.getElementById("toggleMic");
    const toggleVideoBtn = document.getElementById("toggleVideo");
    const shareScreenBtn = document.getElementById("shareScreen");
    const endCallBtn = document.getElementById("endCall");
    
    if (!videoGrid || !chatBox || !chatInput || !sendButton || 
        !toggleMicBtn || !toggleVideoBtn || !shareScreenBtn || !endCallBtn) {
        console.error("One or more required elements are missing in HTML. Check IDs.");
        return;
    }
    
    const config = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };
    
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
    if (existingVideo) return; // Prevent duplicates

    let video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.setAttribute("id", id);
    videoGrid.appendChild(video);
}

    }
    
    function connectToNewUser(userId) {
    if (peerConnections[userId]) return; // Prevent duplicate connections

    const peerConnection = new RTCPeerConnection(config);
    peerConnections[userId] = peerConnection;

        peerConnections[userId] = peerConnection;
        
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
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
        const peerConnection = new RTCPeerConnection(config);
        peerConnections[userId] = peerConnection;
        
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
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
    .then(answer => {
        return peerConnection.setLocalDescription(answer);
    })
    .then(() => {
        socket.emit("answer", roomId, peerConnection.localDescription, userId);
    });

    });
    
    socket.on("answer", (answer, userId) => {
        peerConnections[userId]?.setRemoteDescription(new RTCSessionDescription(answer));
    });
    
    socket.on("candidate", (candidate, userId) => {
    peerConnections[userId]?.addIceCandidate(new RTCIceCandidate(candidate));
});

    
   socket.on("user-disconnected", (userId) => {
    if (peerConnections[userId]) {
        peerConnections[userId].close();
        delete peerConnections[userId];
        document.getElementById(userId)?.remove();
    }
});

    
    toggleMicBtn.onclick = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            toggleMicBtn.innerHTML = audioTrack.enabled ? "Mute" : "Unmute";
        }
    };
    
    toggleVideoBtn.onclick = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            toggleVideoBtn.innerHTML = videoTrack.enabled ? "Stop Video" : "Start Video";
        }
    };
    
    shareScreenBtn.onclick = async () => {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            addVideoStream("screen", screenStream);
            
            Object.values(peerConnections).forEach(peerConnection => {
                peerConnection.getSenders().forEach(sender => {
                    if (sender.track.kind === "video") {
                        sender.replaceTrack(screenStream.getTracks()[0]);
                    }
                });
            });
            
            screenStream.getVideoTracks()[0].onended = () => {
                Object.values(peerConnections).forEach(peerConnection => {
                    peerConnection.getSenders().forEach(sender => {
                        if (sender.track.kind === "video") {
                            sender.replaceTrack(localStream.getVideoTracks()[0]);
                        }
                    });
                });
                document.getElementById("screen")?.remove();
            };
        } catch (error) {
            console.error("Error sharing screen:", error);
        }
    };
    
    endCallBtn.onclick = () => {
        Object.values(peerConnections).forEach(pc => pc.close());
        socket.disconnect();
        videoGrid.innerHTML = "";
    };
    
    sendButton.onclick = () => {
        const message = chatInput.value.trim();
        if (message) {
            socket.emit("chat-message", roomId, message);
            addChatMessage("You", message);
            chatInput.value = "";
        }
    };
    
    socket.on("chat-message", (user, message) => addChatMessage(user, message));
    
    function addChatMessage(user, message) {
        let msgElement = document.createElement("p");
        msgElement.innerHTML = `<strong>${user}:</strong> ${message}`;
        chatBox.appendChild(msgElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    startCamera();
});
