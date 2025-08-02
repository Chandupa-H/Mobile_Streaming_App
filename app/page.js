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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
    };
    setIsMobile(checkMobile());
  }, []);

  // Initialize WebRTC connection
  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real app, you would send this candidate to the other peer via a signaling server
        console.log("ICE candidate:", event.candidate);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteVideoUrl(URL.createObjectURL(event.streams[0]));
      }
    };

    return pc;
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user", // Use 'environment' for back camera
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
        setLocalVideoUrl(URL.createObjectURL(mediaStream));
      }

      setStream(mediaStream);
      setIsStreaming(true);
      setMessage("Camera activated successfully");
    } catch (error) {
      console.error("Error accessing camera:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // Create a new room (host)
  const createRoom = async () => {
    if (!stream) {
      setMessage("Please start camera first");
      return;
    }

    const pc = initializePeerConnection();
    peerRef.current = pc;
    setPeerConnection(pc);

    // Add local stream to peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Create offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveVideo: 1,
        offerToReceiveAudio: 0,
      });

      await pc.setLocalDescription(offer);

      // Generate room ID
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      setRoomId(newRoomId);
      setIsHost(true);
      setIsConnected(true);
      setMessage(
        "Room created! Share this code with your desktop: " + newRoomId
      );
    } catch (error) {
      console.error("Error creating offer:", error);
      setMessage(`Error creating room: ${error.message}`);
    }
  };

  // Join existing room
  const joinRoom = async () => {
    if (!stream || !roomId) {
      setMessage("Please start camera and enter room code");
      return;
    }

    const pc = initializePeerConnection();
    peerRef.current = pc;
    setPeerConnection(pc);

    // Add local stream to peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    setIsConnected(true);
    setMessage("Connecting to room...");
  };

  // Stop streaming
  const stopStreaming = () => {
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

    setIsStreaming(false);
    setIsConnected(false);
    setIsHost(false);
    setRoomId("");
    setMessage("Streaming stopped");
  };

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
          /* Desktop view - instructions */
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
              Open on Mobile Device
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              To use the camera streaming feature, please open this page on your
              mobile device using your browser. This will allow you to access
              your phone's camera and stream video to this desktop application.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 text-left max-w-2xl mx-auto">
              <h3 className="font-semibold text-gray-900 mb-3">Steps:</h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Open this URL on your smartphone</li>
                <li>Allow camera access when prompted</li>
                <li>Click "Start Camera" to activate your phone's camera</li>
                <li>Create a room or join an existing one</li>
                <li>View the stream on this desktop application</li>
              </ol>
            </div>
          </div>
        ) : (
          /* Mobile view - streaming interface */
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
                      isStreaming ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {isStreaming ? "Streaming" : "Not streaming"}
                  </span>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm mb-4 ${
                    message.startsWith("Error")
                      ? "bg-red-50 text-red-700"
                      : message.includes("successfully")
                      ? "bg-green-50 text-green-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Camera preview */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">
                    <p>Camera preview will appear here</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                {!isStreaming ? (
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopStreaming}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Stop Camera
                  </button>
                )}

                {isStreaming && !isConnected && (
                  <button
                    onClick={createRoom}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
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
                  {isHost ? "Host Controls" : "Connected to Room"}
                </h3>

                {isHost && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Code (Share with desktop)
                    </label>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-lg text-center">
                      {roomId}
                    </div>
                  </div>
                )}

                {!isHost && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Room Code
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength="6"
                    />
                  </div>
                )}

                <button
                  onClick={stopStreaming}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Remote stream preview */}
            {remoteVideoUrl && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Desktop View
                </h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
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
                  <p>
                    Click "Start Camera" to allow access to your phone's camera
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">2</span>
                  </div>
                  <p>Click "Create Room" to generate a unique room code</p>
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
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-gray-600 text-sm">
            Uses WebRTC technology for peer-to-peer streaming • No data stored
            on servers
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebRTCPage;
