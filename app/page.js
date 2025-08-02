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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobile =
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
    setIsMobile(mobile);
  }, []);

  // Start camera
  const startCamera = async () => {
    setMessage("Requesting camera access...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });

      setStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch((err) => {
          console.warn("Video autoplay failed:", err);
        });
      }

      setHasCameraPermission(true);
      setIsStreaming(true); // This should now reliably trigger the button
      setMessage('Camera active! Tap "Create Room" to start streaming.');
    } catch (err) {
      console.error("Camera error:", err);
      let errorMsg = "Camera access denied";
      if (err.name === "NotAllowedError") {
        errorMsg = "Please allow camera access in browser settings";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera in use by another app";
      }
      setMessage(`Error: ${errorMsg}`);
      setHasCameraPermission(false);
    }
  };

  // Cleanup
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

  // Create room
  const createRoom = async () => {
    if (!stream) {
      setMessage("Camera not active. Start camera first.");
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
      setMessage(`Room created! Code: ${newRoomId}`);
    } catch (err) {
      console.error("Create room error:", err);
      setMessage(`Failed to create room: ${err.message}`);
      cleanup();
    }
  };

  // Join room (stub for now)
  const joinRoom = () => {
    if (!stream || !roomId) {
      setMessage("Enter a valid room code");
      return;
    }
    setIsConnected(true);
    setMessage("Joining room...");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, []);

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
                  ? "Use phone camera to stream to desktop"
                  : "Open on mobile device"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isMobile ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {isMobile ? "Mobile" : "Desktop"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!isMobile ? (
          /* Desktop view */
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Open on Mobile
            </h2>
            <p className="text-gray-600 mb-6">
              Use your phone's camera by opening this page on your mobile
              browser.
            </p>
          </div>
        ) : (
          /* Mobile view */
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Camera Stream
                </h2>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isStreaming ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {isStreaming ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm mb-4 ${
                    message.includes("Error")
                      ? "bg-red-50 text-red-700"
                      : message.includes("successfully") ||
                        message.includes("active")
                      ? "bg-green-50 text-green-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Action Buttons */}
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

                {/* ✅ Create Room Button - Now Always Visible When Streaming & Not Connected */}
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

            {/* Room Code Display */}
            {isConnected && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
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

      <div className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          WebRTC • Peer-to-Peer • No data stored
        </div>
      </div>
    </div>
  );
};

export default WebRTCPage;
