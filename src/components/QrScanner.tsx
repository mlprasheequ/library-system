'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface QrScannerProps {
  onResult: (result: string) => void;
  onError?: (error: Error) => void;
}

export default function QrScanner({ onResult, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');

  const scanQRCode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          onResult(code.data);
          return;
        }
      } catch (e) {
        // Continue scanning
      }
    }

    if (isScanning) {
      requestAnimationFrame(scanQRCode);
    }
  }, [isScanning, onResult]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsScanning(true);
          };
        }
      } catch (err: any) {
        setError('Camera access denied or not available');
        onError?.(err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsScanning(false);
    };
  }, [onError]);

  useEffect(() => {
    if (isScanning) {
      scanQRCode();
    }
  }, [isScanning, scanQRCode]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-rose-400 text-sm font-bold">{error}</p>
        </div>
      )}

      {!error && !isScanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-indigo-400 text-sm font-bold animate-pulse">Initializing camera...</p>
        </div>
      )}
    </div>
  );
}
