"use client";
import { useState, useRef, useEffect } from "react";

const WebRTCPage = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stream, setStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localVideoUrl, setLocalVideoUrl] = useState("");
  const [remoteVideoUrl, setRemoteVideoUrl] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [message, setMessage] = useState("");
  const [hasCameraPermission, setHasCameraPermission] = useState(null);

  const localVideoRef = useRef(null); // For desktop preview
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

  // Start camera
  const startCamera = async () => {
    try {
      setMessage("Requesting camera access...");

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      // Store the stream
      setStream(mediaStream);

      // Set video source (only for desktop preview)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        localVideoRef.current.play().catch((err) => {
          console.warn("Video autoplay failed:", err);
        });
      }

      setHasCameraPermission(true);
      setIsStreaming(true); // Ensure isStreaming is set to true
      setMessage(
        'Camera activated successfully! Tap "Create Room" to start streaming.'
      );
    } catch (err) {
      console.error("Camera error:", err);
      let errorMsg = "Camera access denied";
      if (err.name === "NotAllowedError") {
        errorMsg = "Please allow camera access in browser settings";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera is already in use by another app";
      }
      setMessage(`Error: ${errorMsg}`);
      setHasCameraPermission(false);
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsStreaming(false);
    setIsConnected(false);
    setIsHost(false);
    setRoomId("");
  };

  // Stop streaming
  const stopStreaming = () => {
    cleanup();
    setMessage("Streaming stopped");
  };

  // Create a new room (host)
  const createRoom = async () => {
    if (!stream) {
      setMessage("Please start camera first");
      return;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;
      setPeerConnection(pc);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({ offerToReceiveVideo: 1 });
      await pc.setLocalDescription(offer);

      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      setRoomId(newRoomId);
      setIsHost(true);
      setIsConnected(true);
      setMessage(`Room created! Share this code: ${newRoomId}`);
    } catch (err) {
      console.error("Create room error:", err);
      setMessage(`Failed to create room: ${err.message}`);
      cleanup();
    }
  };

  // Join existing room
  const joinRoom = async () => {
    if (!stream || !roomId) {
      setMessage("Enter a valid room code");
      return;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;
      setPeerConnection(pc);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      setIsConnected(true);
      setMessage("Connecting to room...");
    } catch (error) {
      console.error("Join room error:", error);
      setMessage(`Failed to join room: ${error.message}`);
      cleanup();
    }
  };

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stream) {
        // Pause camera when tab is hidden
        stream.getTracks().forEach((track) => (track.enabled = false));
      } else if (stream) {
        // Resume camera when tab is visible
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
                  ? "Use your phone camera to stream to desktop"
                  : "Please open this on your mobile device"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isMobile ? "bg-green-500" : "bg-red-500"
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
        {!isMobile ? (
          /* Desktop view */
          <div className="space-y-6">
            {/* Room code input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Join a Room
              </h2>
              <p className="text-gray-600 mb-4">
                Enter the room code shared by the mobile device to connect and
                view the camera stream.
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
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength="6"
              />
              <button
                onClick={joinRoom}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Join Room
              </button>
            </div>

            {/* Remote stream preview */}
            {isConnected && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Remote Camera Stream
                </h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

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
                  <p>Share the room code with your desktop application</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">4</span>
                  </div>
                  <p>Your desktop will connect and display the camera stream</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Mobile view */
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
                      isStreaming
                        ? "bg-green-500"
                        : hasCameraPermission === false
                        ? "bg-red-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {isStreaming
                      ? "Streaming"
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
                      : message.includes("successfully")
                      ? "bg-green-50 text-green-700"
                      : message.includes("Please allow")
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Controls */}
              <div className="grid grid-cols-1 gap-3">
                {!isStreaming ? (
                  <button
                    onClick={startCamera}
                    disabled={hasCameraPermission === false}
                    className={`py-3 px-6 font-medium rounded-lg transition-colors ${
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
                  <button
                    onClick={stopStreaming}
                    className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Stop Camera
                  </button>
                )}

                {/* Show "Create Room" button only when streaming & not connected */}
                {isStreaming && !isConnected && (
                  <button
                    onClick={createRoom}
                    className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-md"
                    style={{ marginTop: "1rem" }}
                  >
                    Create Room
                  </button>
                )}
              </div>
            </div>

            {/* Room controls */}
            {isConnected && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isHost ? "Your Room Code" : "Connected"}
                </h3>
                {isHost && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-lg text-center mb-4">
                    {roomId}
                  </div>
                )}
                <button
                  onClick={stopStreaming}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                How to Use
              </h3>
              <ol className="text-gray-700 space-y-2">
                <li>
                  <strong>1.</strong> Tap <strong>"Start Camera"</strong>
                </li>
                <li>
                  <strong>2.</strong> Tap <strong>"Create Room"</strong>
                </li>
                <li>
                  <strong>3.</strong> Share the room code with desktop
                </li>
                <li>
                  <strong>4.</strong> View stream on desktop app
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          WebRTC • Peer-to-Peer • No data stored
        </div>
      </div>
    </div>
  );
};

export default WebRTCPage;
