import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MdCameraAlt, MdRefresh, MdSwitchCamera, MdCancel, MdError } from 'react-icons/md';

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [flash, setFlash] = useState(false);

  // Initialize and list video devices
  useEffect(() => {
    let activeStream = null;

    async function initCamera() {
      try {
        setLoading(true);
        setError('');

        // Request initial stream to trigger permissions prompt
        const initialStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } }
        });
        activeStream = initialStream;
        setStream(initialStream);

        if (videoRef.current) {
          videoRef.current.srcObject = initialStream;
        }

        // Get available camera devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);

        // Find current device ID
        const activeTrack = initialStream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          const matchingDevice = videoDevices.find(d => d.label === activeTrack.label);
          setSelectedDeviceId(matchingDevice?.deviceId || settings.deviceId || videoDevices[0]?.deviceId || '');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error opening camera:', err);
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera access denied. Please grant camera permission in your browser.'
            : 'Could not access the system camera. Please check if another app is using it.'
        );
        setLoading(false);
      }
    }

    initCamera();

    // Cleanup stream on unmount
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Switch camera when selectedDeviceId changes
  const handleDeviceChange = async (deviceId) => {
    if (!deviceId) return;
    setSelectedDeviceId(deviceId);
    setLoading(true);
    setError('');

    // Stop current tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setLoading(false);
    } catch (err) {
      console.error('Error switching camera:', err);
      setError('Failed to switch to the selected camera.');
      setLoading(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video stream dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame on canvas (mirrored to match preview)
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    // Convert canvas to Blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleUsePhoto = () => {
    if (capturedBlob) {
      // Create a File object from the blob
      const file = new File([capturedBlob], `captured_photo_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      onCapture(file);
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onCancel();
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 relative overflow-hidden shadow-inner text-white flex flex-col items-center">
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Header */}
      <div className="w-full flex justify-between items-center mb-3">
        <span className="text-sm font-semibold tracking-wider uppercase text-gray-400">
          {previewUrl ? 'Captured Image' : 'System Camera'}
        </span>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-gray-800"
          title="Close Camera"
        >
          <MdCancel className="text-2xl" />
        </button>
      </div>

      {/* Main viewport */}
      <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-lg overflow-hidden flex items-center justify-center border border-gray-800">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-malawiGold mb-2"></div>
            <span className="text-sm text-gray-400">Starting camera stream...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-4 text-center z-10">
            <MdError className="text-red-500 text-4xl mb-2" />
            <p className="text-sm text-gray-300 font-medium mb-3">{error}</p>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs transition"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Camera Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-white z-20 transition-opacity duration-150 ease-out opacity-100 animate-flash"></div>
        )}

        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Captured Inmate"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        )}
      </div>

      {/* Camera Controls */}
      <div className="w-full mt-4 flex flex-col items-center gap-3">
        {/* Device selector */}
        {!previewUrl && devices.length > 1 && (
          <div className="flex items-center gap-2 max-w-xs w-full bg-gray-800 rounded px-2 py-1 text-xs">
            <MdSwitchCamera className="text-gray-400 text-lg flex-shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="bg-transparent border-0 text-white outline-none w-full cursor-pointer py-1 text-xs"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-gray-800 text-white">
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 w-full">
          {previewUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded transition text-sm"
              >
                <MdRefresh className="text-lg" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex items-center gap-2 px-5 py-2 bg-malawiGreen hover:bg-opacity-95 text-white font-semibold rounded shadow transition text-sm"
              >
                Use Photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={capturePhoto}
              disabled={loading || !!error}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-white hover:bg-gray-100 active:scale-95 transition shadow disabled:opacity-50 disabled:pointer-events-none"
              title="Capture Photo"
            >
              <div className="w-11 h-11 rounded-full border-2 border-gray-900 bg-red-600"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

CameraCapture.propTypes = {
  onCapture: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};
