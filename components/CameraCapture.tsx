'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCw, Check } from 'lucide-react';
import { Button } from './Button';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  label?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  label = '名刺を撮影'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);

  // カメラの起動
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error('カメラの起動に失敗しました:', err);
      setError('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    }
  }, [facingMode]);

  // カメラの停止
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // カメラの切り替え
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  // 撮影
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // キャンバスのサイズを動画と同じに設定
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 動画フレームをキャンバスに描画
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // キャンバスから画像データを取得
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  // 撮り直し
  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // 画像を確定
  const confirmImage = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCamera();
      onClose();
    }
  }, [capturedImage, onCapture, onClose, stopCamera]);

  // コンポーネントマウント時にカメラを起動
  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-white rounded-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{label}</h3>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* カメラビュー */}
          <div className="relative bg-black aspect-[4/3]">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center text-white p-4 text-center">
                <div>
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{error}</p>
                </div>
              </div>
            ) : capturedImage ? (
              <img 
                src={capturedImage} 
                alt="撮影した名刺" 
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                {/* ガイドフレーム */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white opacity-50 rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>
                  </div>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                    枠内に名刺を合わせてください
                  </p>
                </div>
              </>
            )}
          </div>

          {/* コントロール */}
          <div className="p-4 bg-gray-50">
            {capturedImage ? (
              <div className="flex gap-2">
                <Button
                  onClick={retake}
                  variant="secondary"
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  撮り直す
                </Button>
                <Button
                  onClick={confirmImage}
                  variant="primary"
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  この画像を使用
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                {!error && (
                  <>
                    <Button
                      onClick={switchCamera}
                      variant="secondary"
                      size="sm"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      variant="primary"
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      撮影
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 隠しキャンバス（画像処理用） */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};