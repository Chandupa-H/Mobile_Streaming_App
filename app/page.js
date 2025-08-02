"use client";
import { useState, useRef, useEffect } from "react";

const WebRTCPage = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stream, setStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [message, setMessage] = useState("");
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [offerData, setOfferData] = useState("");
  const [answerData, setAnswerData] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
    };
    setIsMobile(checkMobile());
  }, []);

  // Request camera permissions and start stream
  const startCamera = async () => {
    try {
      setMessage("Requesting camera access...");

      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 60 },
        },
        audio: true, // Enable audio
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(mediaStream);

      // Set video source for mobile preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        try {
          await localVideoRef.current.play();
        } catch (err) {
          console.error("Error playing video:", err);
        }
      }

      setHasCameraPermission(true);
      setIsStreaming(true);
      setMessage(
        "Camera activated successfully! Ready to create or join a room."
      );
      console.log("Camera started - isStreaming should be true");
    } catch (error) {
      console.error("Error accessing camera:", error);
      let errorMsg = "Camera access denied";
      if (error.name === "NotAllowedError") {
        errorMsg = "Please allow camera access in your browser settings";
      } else if (error.name === "NotFoundError") {
        errorMsg = "No camera found on this device";
      } else if (error.name === "NotReadableError") {
        errorMsg = "Camera is already in use by another application";
      }
      setMessage(`Error: ${errorMsg}`);
      setHasCameraPermission(false);
    }
  };

  // Create WebRTC peer connection
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);

    // Add event listeners
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate:", event.candidate);
        // In a real app, send this to the other peer via signaling server
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote stream");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        setMessage("Successfully connected!");
      } else if (pc.connectionState === "failed") {
        setMessage("Connection failed. Please try again.");
      }
    };

    return pc;
  };

  // Create a new room (host)
  const createRoom = async () => {
    if (!stream) {
      setMessage("Please start camera first");
      return;
    }

    try {
      setMessage("Creating room...");

      const pc = createPeerConnection();
      peerRef.current = pc;
      setPeerConnection(pc);

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Generate room ID
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      setRoomId(newRoomId);
      setIsHost(true);
      setMessage(`Room created! Room ID: ${newRoomId}`);

      // Create offer for manual signaling
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });

      await pc.setLocalDescription(offer);
      setOfferData(JSON.stringify(offer));
    } catch (error) {
      console.error("Error creating room:", error);
      setMessage(`Error creating room: ${error.message}`);
    }
  };

  // Join existing room
  const joinRoom = async () => {
    if (!stream || !roomId.trim()) {
      setMessage("Please start camera and enter room code");
      return;
    }

    try {
      setMessage("Joining room...");

      const pc = createPeerConnection();
      peerRef.current = pc;
      setPeerConnection(pc);

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      setMessage(`Joined room: ${roomId}. Waiting for connection...`);
    } catch (error) {
      console.error("Error joining room:", error);
      setMessage(`Error joining room: ${error.message}`);
    }
  };

  // Handle offer (for joiners)
  const handleOffer = async () => {
    if (!peerConnection || !offerData.trim()) {
      setMessage("No peer connection or offer data");
      return;
    }

    try {
      const offer = JSON.parse(offerData);
      await peerConnection.setRemoteDescription(offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      setAnswerData(JSON.stringify(answer));
      setMessage("Answer created! Share this with the room creator.");
    } catch (error) {
      console.error("Error handling offer:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // Handle answer (for hosts)
  const handleAnswer = async () => {
    if (!peerConnection || !answerData.trim()) {
      setMessage("No peer connection or answer data");
      return;
    }

    try {
      const answer = JSON.parse(answerData);
      await peerConnection.setRemoteDescription(answer);
      setIsConnected(true);
      setMessage("Connected successfully!");
    } catch (error) {
      console.error("Error handling answer:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    peerRef.current = null;
    setIsStreaming(false);
    setIsConnected(false);
    setIsHost(false);
    setRoomId("");
    setOfferData("");
    setAnswerData("");
    setConnectionState("disconnected");
  };

  // Stop streaming
  const stopStreaming = () => {
    cleanup();
    setMessage("Camera stopped");
  };

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stream) {
        stream.getTracks().forEach((track) => (track.enabled = false));
      } else if (stream) {
        stream.getTracks().forEach((track) => (track.enabled = true));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cleanup();
    };
  }, [stream]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mobile Camera Stream
              </h1>
              <p className="text-gray-600 mt-1">
                {isMobile
                  ? "Use your phone camera to stream"
                  : "View streams from mobile devices"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isMobile ? "bg-green-500" : "bg-blue-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {isMobile ? "Mobile Device" : "Desktop Device"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Mobile view - streaming interface */}
        {isMobile ? (
          <div className="space-y-6">
            {/* Status indicator */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Camera Stream
                </h2>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connectionState === "connected"
                        ? "bg-green-500"
                        : isStreaming
                        ? "bg-yellow-500"
                        : hasCameraPermission === false
                        ? "bg-red-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {connectionState === "connected"
                      ? "Connected"
                      : isStreaming
                      ? `Ready (Streaming: ${isStreaming})`
                      : hasCameraPermission === false
                      ? "No Access"
                      : "Not streaming"}
                  </span>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm mb-4 ${
                    message.includes("Error")
                      ? "bg-red-50 text-red-700"
                      : message.includes("successfully") ||
                        message.includes("Connected")
                      ? "bg-green-50 text-green-700"
                      : message.includes("Please allow")
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Camera preview */}
              {isStreaming && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Debug info - remove in production */}
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4 text-xs">
                <div>isStreaming: {isStreaming.toString()}</div>
                <div>isHost: {isHost.toString()}</div>
                <div>roomId: {roomId || "empty"}</div>
                <div>
                  hasCameraPermission:{" "}
                  {hasCameraPermission?.toString() || "null"}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                {!isStreaming ? (
                  <button
                    onClick={startCamera}
                    disabled={hasCameraPermission === false}
                    className={`w-full font-medium py-3 px-4 rounded-lg transition-colors ${
                      hasCameraPermission === false
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {hasCameraPermission === false
                      ? "Fix Permissions"
                      : "Start Camera"}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={createRoom}
                      disabled={isHost}
                      className={`font-medium py-3 px-4 rounded-lg transition-colors ${
                        isHost
                          ? "bg-green-200 text-green-800 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {isHost ? "✓ Room Created" : "Create Room"}
                    </button>
                    <button
                      onClick={stopStreaming}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Stop Camera
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Room management - Always show for debugging */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Room Management{" "}
                {isStreaming
                  ? "(Active)"
                  : "(Inactive - isStreaming: " + isStreaming + ")"}
              </h3>

              {/* Show room code prominently when host */}
              {isHost && roomId && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Room Code (Share with viewer)
                  </label>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg px-4 py-4 font-mono text-2xl text-center text-green-800 font-bold">
                    {roomId}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Share this code with the desktop viewer
                  </p>
                </div>
              )}

              {!isHost && !roomId && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Room Code to Join
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) =>
                      setRoomId(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      )
                    }
                    placeholder="Enter 6-digit code"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    maxLength="6"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!roomId.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              )}

              {/* Manual signaling for demo purposes */}
              {isHost && offerData && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offer Data (Copy to viewer)
                  </label>
                  <textarea
                    value={offerData}
                    readOnly
                    className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}

              {isHost && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Data (Paste from viewer)
                  </label>
                  <textarea
                    value={answerData}
                    onChange={(e) => setAnswerData(e.target.value)}
                    placeholder="Paste answer data here..."
                    className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono mb-2"
                  />
                  <button
                    onClick={handleAnswer}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Connect with Answer
                  </button>
                </div>
              )}

              {!isHost && peerConnection && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offer Data (Paste from host)
                  </label>
                  <textarea
                    value={offerData}
                    onChange={(e) => setOfferData(e.target.value)}
                    placeholder="Paste offer data here..."
                    className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono mb-2"
                  />
                  <button
                    onClick={handleOffer}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mb-4"
                  >
                    Process Offer
                  </button>

                  {answerData && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Answer Data (Copy to host)
                      </label>
                      <textarea
                        value={answerData}
                        readOnly
                        className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // </div>
          /* Desktop view - viewing interface */
          <div className="space-y-6">
            {/* Room code input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Join a Room
              </h2>
              <p className="text-gray-600 mb-4">
                Enter the room code from the mobile device to connect and view
                the stream.
              </p>
              <input
                type="text"
                value={roomId}
                onChange={(e) =>
                  setRoomId(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                  )
                }
                placeholder="Enter 6-digit room code"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                maxLength="6"
              />
              <button
                onClick={joinRoom}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors mb-4"
              >
                Join Room
              </button>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.includes("Error")
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>

            {/* Remote stream preview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Remote Camera Stream
              </h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm text-gray-600 text-center">
                {connectionState === "connected"
                  ? "Stream connected"
                  : "Waiting for stream..."}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                How to Use
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">1</span>
                  </div>
                  <p>Open this page on your mobile device</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">2</span>
                  </div>
                  <p>Allow camera access and create a room</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">3</span>
                  </div>
                  <p>Copy the offer data and paste it here</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">4</span>
                  </div>
                  <p>Copy the answer data back to your mobile device</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-600 text-sm">
            Uses WebRTC technology for peer-to-peer streaming • Manual signaling
            for demo
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebRTCPage;
