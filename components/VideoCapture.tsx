'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Video, Check, RotateCcw, AlertCircle, Square } from 'lucide-react';

interface VideoCaptureProps {
  onCaptureComplete: (frontImage: string, backImage: string) => void;
  onCancel: () => void;
}

export default function VideoCapture({ onCaptureComplete, onCancel }: VideoCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [extractedImages, setExtractedImages] = useState<{
    front: string | null;
    back: string | null;
  }>({ front: null, back: null });
  const [processingVideo, setProcessingVideo] = useState(false);
  const [instruction, setInstruction] = useState('録画ボタンを押して開始');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // カメラを起動
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (error) {
      console.error('カメラの起動に失敗しました:', error);
      alert('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    }
  };

  // 録画開始
  const startRecording = () => {
    if (!streamRef.current) {
      alert('カメラが起動していません');
      return;
    }

    chunksRef.current = [];
    setRecordingTime(0);
    
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        await processVideo(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // 100msごとにデータを取得
      setIsRecording(true);
      setInstruction('表面を撮影中... (3秒間)');

      // タイマー開始
      let time = 0;
      timerRef.current = setInterval(() => {
        time += 1;
        setRecordingTime(time);
        
        if (time === 3) {
          setInstruction('裏面を撮影中... (3秒間)');
        }
        
        if (time >= 6) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error('録画開始エラー:', error);
      alert('録画を開始できませんでした');
    }
  };

  // 録画停止
  const stopRecording = () => {
    console.log('停止ボタンが押されました');
    
    // タイマーをクリア
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // 録画を停止
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setHasRecorded(true);
        setInstruction('動画を処理中...');
        setRecordingTime(0);
      } catch (error) {
        console.error('録画停止エラー:', error);
      }
    }
  };

  // 動画から静止画を抽出
  const processVideo = async (videoBlob: Blob) => {
    setProcessingVideo(true);
    
    try {
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.currentTime = 0;
          resolve(null);
        };
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context取得失敗');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 表面の画像を抽出（1.5秒時点）
      video.currentTime = Math.min(1.5, video.duration * 0.25);
      await new Promise(resolve => video.onseeked = resolve);
      ctx.drawImage(video, 0, 0);
      const frontImage = canvas.toDataURL('image/jpeg', 0.95);

      // 裏面の画像を抽出（4.5秒時点）
      video.currentTime = Math.min(4.5, video.duration * 0.75);
      await new Promise(resolve => video.onseeked = resolve);
      ctx.drawImage(video, 0, 0);
      const backImage = canvas.toDataURL('image/jpeg', 0.95);

      setExtractedImages({ front: frontImage, back: backImage });
      setInstruction('画像の抽出が完了しました');

      // メモリクリーンアップ
      URL.revokeObjectURL(videoUrl);
      video.remove();
      canvas.remove();
      chunksRef.current = [];
      
    } catch (error) {
      console.error('動画処理エラー:', error);
      alert('動画の処理に失敗しました。もう一度お試しください。');
      handleReset();
    } finally {
      setProcessingVideo(false);
    }
  };

  // カメラ停止
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // 完了処理
  const handleComplete = () => {
    if (extractedImages.front && extractedImages.back) {
      stopCamera();
      onCaptureComplete(extractedImages.front, extractedImages.back);
    }
  };

  // リセット
  const handleReset = () => {
    setHasRecorded(false);
    setExtractedImages({ front: null, back: null });
    setInstruction('録画ボタンを押して開始');
    setRecordingTime(0);
    chunksRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startCamera();
  };

  // キャンセル処理
  const handleCancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopCamera();
    onCancel();
  };

  // コンポーネントマウント時
  useEffect(() => {
    startCamera();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-gray-900 p-3 sm:p-4 text-white">
        <div className="flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-semibold">動画で名刺を撮影</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white text-2xl px-2"
          >
            ✕
          </button>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">{instruction}</p>
      </div>

      {/* ビデオプレビュー */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {!hasRecorded ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4">
            {processingVideo ? (
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>動画を処理中...</p>
              </div>
            ) : extractedImages.front && extractedImages.back ? (
              <div className="w-full max-w-2xl">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  <div>
                    <p className="text-white text-xs sm:text-sm mb-1 sm:mb-2">表面</p>
                    <img src={extractedImages.front} alt="表面" className="w-full rounded" />
                  </div>
                  <div>
                    <p className="text-white text-xs sm:text-sm mb-1 sm:mb-2">裏面</p>
                    <img src={extractedImages.back} alt="裏面" className="w-full rounded" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 録画インジケーター */}
        {isRecording && (
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-center">
            <div className="flex items-center gap-2 bg-red-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>録画中</span>
            </div>
            <div className="bg-black bg-opacity-50 text-white px-2 sm:px-3 py-1 rounded-full">
              <span className="text-sm sm:text-lg font-mono">{recordingTime}/6秒</span>
            </div>
          </div>
        )}
      </div>

      {/* コントロールボタン */}
      <div className="bg-gray-900 p-4">
        {!hasRecorded ? (
          <div className="flex justify-center">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 sm:px-8 sm:py-4 transition-colors flex items-center gap-2"
              >
                <Video size={20} className="sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">録画開始</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6 py-3 sm:px-8 sm:py-4 transition-colors flex items-center gap-2"
              >
                <Square size={20} className="sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">録画停止</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center gap-3 sm:gap-4">
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg py-2 px-4 sm:py-2 sm:px-6 flex items-center gap-2 text-sm sm:text-base"
            >
              <RotateCcw size={16} className="sm:w-[18px] sm:h-[18px]" />
              撮り直す
            </button>
            <button
              onClick={handleComplete}
              disabled={!extractedImages.front || !extractedImages.back || processingVideo}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 px-4 sm:py-2 sm:px-6 flex items-center gap-2 disabled:opacity-50 text-sm sm:text-base"
            >
              <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
              完了
            </button>
          </div>
        )}
      </div>

      {/* 使い方の説明 - モバイル対応 */}
      {!isRecording && !hasRecorded && (
        <div className="bg-blue-900 p-2 sm:p-3 text-blue-100">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0 sm:w-4 sm:h-4" />
            <div className="text-xs">
              <p className="font-semibold mb-1">撮影方法:</p>
              <ol className="space-y-0.5 sm:space-y-1">
                <li>1. 録画ボタンを押して開始</li>
                <li>2. 最初の3秒で表面を撮影</li>
                <li>3. 次の3秒で裏面を撮影</li>
                <li>4. 自動的に画像が抽出されます</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}