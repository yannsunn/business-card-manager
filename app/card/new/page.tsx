'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Camera, Upload, Sparkles, X, Check, Edit2, Globe, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

export default function NewCardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  
  // デバッグ用: コンポーネントマウント時とステップ変更時にログ出力
  useEffect(() => {
    console.log('🚀 NewCardPage マウント完了');
    console.log('🚀 初期ステップ:', step);
  }, [step]);
  
  useEffect(() => {
    console.log('🚀 ステップが変更されました:', step);
    if (step === 'review') {
      console.log('⚠️ reviewステップに移行しました！');
    }
  }, [step]);
  const [uploadedImages, setUploadedImages] = useState<{ front: string; back: string }>({
    front: '',
    back: ''
  });
  
  const [formData, setFormData] = useState<BusinessCard>({
    name: '',
    companyName: '',
    title: '',
    urls: [''],  // 初期状態で1つの空URLフィールドを表示
    emails: [''],  // 初期状態で1つの空メールフィールドを表示
    phones: [''],  // 初期状態で1つの空電話番号フィールドを表示
    line_ids: [],
    businessContent: '',
    exchangeDate: new Date().toISOString().split('T')[0],
    notes: '',
    frontImageBase64: '',
    backImageBase64: ''
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchingUrls, setFetchingUrls] = useState<string[]>([]);

  // 自動AI解析を削除（手動で実行するように変更）

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, source: 'file' | 'camera') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));

    // 入力をリセット
    if (source === 'file' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (source === 'camera' && cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    console.log('🔍 processFiles開始: ファイル数=', files.length);
    console.log('🔍 現在のステップ:', step);
    
    // Import validation functions
    const { validateImageFile, validateTotalSize, MAX_IMAGE_SIZE, MAX_TOTAL_SIZE } = await import('@/lib/validation/imageValidation');
    
    // Validate total size of all images
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (!validateTotalSize([totalSize], MAX_TOTAL_SIZE)) {
      alert(`合計画像サイズは${(MAX_TOTAL_SIZE / 1024 / 1024).toFixed(0)}MB以下にしてください`);
      return;
    }
    
    // Validate each image file
    for (const file of files) {
      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      if (validation.warnings) {
        console.warn('画像警告:', validation.warnings);
      }
    }
    
    // 画像をリサイズ・圧縮する関数（文字認識精度を重視しつつサイズ制限対応）
    const resizeImage = (file: File, maxWidth: number = 1800, maxHeight: number = 1800, quality: number = 0.85): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // キャンバスサイズを計算
            let width = img.width;
            let height = img.height;
            
            // モバイルの場合でも文字認識のために適度な解像度を維持
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
              maxWidth = 1600;  // モバイルは1600pxに制限
              maxHeight = 1600;
              quality = 0.82;   // モバイルは圧縮率を上げる
            }
            
            // 元画像が既に小さい場合はリサイズしない
            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((maxWidth / width) * height);
                width = maxWidth;
              } else {
                width = Math.round((maxHeight / height) * width);
                height = maxHeight;
              }
            }
            
            // キャンバスで画像をリサイズ
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context取得失敗'));
              return;
            }
            
            // アンチエイリアスを有効にして描画品質を向上
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // 常にJPEG形式を使用（サイズ制限対応）
            let base64: string;
            base64 = canvas.toDataURL('image/jpeg', quality);
            
            // サイズが大きすぎる場合は品質を段階的に下げる
            let currentQuality = quality;
            while (base64.length > 1.5 * 1024 * 1024 && currentQuality > 0.5) {
              currentQuality -= 0.05;
              base64 = canvas.toDataURL('image/jpeg', currentQuality);
              console.log(`品質調整: ${currentQuality.toFixed(2)}`);
            }
            
            console.log(`画像処理完了(JPEG): ${img.width}x${img.height} → ${width}x${height}`);
            console.log(`ファイルサイズ: 約${Math.round(base64.length * 0.75 / 1024)}KB, 品質: ${currentQuality.toFixed(2)}`);
            
            // 最終的なサイズチェック
            if (base64.length > 2 * 1024 * 1024) {
              console.warn('画像サイズが大きすぎます。さらに圧縮が必要です。');
            }
            resolve(base64);
          };
          img.onerror = () => reject(new Error('画像の読み込みに失敗'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗'));
        reader.readAsDataURL(file);
      });
    };

    // 最初の画像を表面として設定（リサイズ・圧縮）
    if (files[0]) {
      try {
        const base64 = await resizeImage(files[0]);
        console.log('🔍 表面画像設定完了');
        setUploadedImages(prev => ({ ...prev, front: base64 }));
        setFormData(prev => ({ ...prev, frontImageBase64: base64 }));
      } catch (error) {
        console.error('表面画像の処理エラー:', error);
        alert('画像の処理に失敗しました。別の画像をお試しください。');
      }
    }

    // 2枚目があれば裏面として設定（リサイズ・圧縮）
    if (files[1]) {
      try {
        const base64 = await resizeImage(files[1]);
        console.log('🔍 裏面画像設定完了');
        setUploadedImages(prev => ({ ...prev, back: base64 }));
        setFormData(prev => ({ ...prev, backImageBase64: base64 }));
      } catch (error) {
        console.error('裏面画像の処理エラー:', error);
        alert('画像の処理に失敗しました。別の画像をお試しください。');
      }
    }
    
    console.log('🔍 processFiles終了: ステップは変更なし（uploadのまま）');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleSingleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像をリサイズ・圧縮する（文字認識精度を重視）
    const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            // 文字認識精度のため高解像度を維持
            const maxSize = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 2000 : 2400;
            
            // 元画像が既に小さい場合はリサイズしない
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((maxSize / width) * height);
                width = maxSize;
              } else {
                width = Math.round((maxSize / height) * width);
                height = maxSize;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context取得失敗'));
              return;
            }
            
            // アンチエイリアスを有効にして描画品質を向上
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // PNGとJPEGを比較して適切な形式を選択
            let base64: string;
            const pngData = canvas.toDataURL('image/png');
            const jpegData = canvas.toDataURL('image/jpeg', 0.95);
            
            // サイズを比較（5MB以下ならPNG優先）
            if (pngData.length < 5 * 1024 * 1024 / 0.75) {
              base64 = pngData;
              console.log(`${side}画像処理(PNG): ${img.width}x${img.height} → ${width}x${height}`);
            } else {
              base64 = jpegData;
              console.log(`${side}画像処理(JPEG): ${img.width}x${img.height} → ${width}x${height}`);
            }
            
            resolve(base64);
          };
          img.onerror = () => reject(new Error('画像読み込み失敗'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('ファイル読み込み失敗'));
        reader.readAsDataURL(file);
      });
    };

    try {
      const base64 = await resizeImage(file);
      setUploadedImages(prev => ({ ...prev, [side]: base64 }));
      setFormData(prev => ({ 
        ...prev, 
        [`${side}ImageBase64`]: base64 
      }));
    } catch (error) {
      console.error(`${side}画像の処理エラー:`, error);
      alert('画像の処理に失敗しました。別の画像をお試しください。');
    }
  };

  const scanQRCode = (base64Image: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code ? code.data : null);
      };
      image.src = base64Image;
    });
  };

  const fetchUrlInfo = async (urls: string[]) => {
    console.log('===== fetchUrlInfo開始 =====');
    console.log('入力URL:', urls);
    
    // モバイルデバッグ用の表示
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('モバイルデバイス:', isMobile);
    console.log('User Agent:', navigator.userAgent);
    
    // 有効なURLのみフィルタリング（ボタンテキストを除外）
    const validUrls = urls.filter(url => {
      // URLが空でないこと
      if (!url || !url.trim()) {
        console.log('空のURLをスキップ:', url);
        return false;
      }
      // URLが "URL情報を取得" というボタンテキストでないこと
      if (url === 'URL情報を取得' || url === '全URL情報を一括取得') {
        console.log('ボタンテキストをスキップ:', url);
        return false;
      }
      // すでに取得中でないこと
      if (fetchingUrls.includes(url)) {
        console.log('取得中のURLをスキップ:', url);
        return false;
      }
      return true;
    });
    
    if (validUrls.length === 0) {
      console.log('有効なURLがありません');
      if (isMobile) {
        alert('有効なURLがありません。URLを入力してください。');
      }
      return;
    }
    
    console.log('有効なURL:', validUrls);
    
    if (isMobile) {
      alert(`URL情報取得を開始します\n\n対象URL:\n${validUrls.join('\n')}`);
    }
    
    // 複数URLを一括処理する新しいAPIを使用
    if (validUrls.length >= 1) { // 1つ以上の場合はすべて一括処理
      setFetchingUrls(prev => [...prev, ...validUrls]);
      
      try {
        console.log('API呼び出し中: /api/analyze-urls');
        const response = await fetch('/api/analyze-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: validUrls }),
          // モバイル用にタイムアウトを設定
          signal: AbortSignal.timeout(30000) // 30秒のタイムアウト
        });
        
        console.log('APIレスポンスステータス:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('APIエラー:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('複数URL統合解析結果:', data);
        
        // モバイルデバッグ用の詳細表示
        if (isMobile) {
          const successMessage = [
            'URL情報取得完了',
            '',
            `事業内容: ${data.businessContent ? '✓ 取得成功' : '✗ 取得失敗'}`,
            `要約: ${data.summaries && Object.keys(data.summaries).length > 0 ? '✓ 取得成功' : '✗ 取得失敗'}`,
            `会社情報: ${data.companyInfo ? '✓ 取得成功' : '✗ 取得失敗'}`
          ].join('\n');
          alert(successMessage);
        }
        
        setFormData(prev => {
          console.log('現在のフォームデータ:', prev);
          
          let businessContent = prev.businessContent || '';
          let notes = prev.notes || '';
          
          // 事業内容を更新
          if (data.businessContent) {
            businessContent = businessContent 
              ? `${businessContent}\n\n${data.businessContent}`.trim()
              : data.businessContent;
            console.log('事業内容更新:', businessContent);
          }
          
          // 各URLの要約をメモに追加
          if (data.summaries && Object.keys(data.summaries).length > 0) {
            const summaryText = Object.entries(data.summaries)
              .map(([url, summary]) => `【${url}】\n${summary}`)
              .join('\n\n');
            
            const urlInfoSection = `=== URL情報 ===\n${summaryText}`;
            notes = notes 
              ? `${notes}\n\n${urlInfoSection}`.trim()
              : urlInfoSection;
            console.log('メモ更新（URL情報）:', notes);
          }
          
          // 事業内容もメモに追加（重複を避ける）
          if (businessContent && !notes.includes('=== 事業内容 ===')) {
            const businessSection = `=== 事業内容 ===\n${businessContent}`;
            notes = notes ? `${notes}\n\n${businessSection}`.trim() : businessSection;
            console.log('メモ更新（事業内容）:', notes);
          }
          
          // 会社情報が取得できた場合、該当フィールドを更新
          if (data.companyInfo) {
            const info = data.companyInfo;
            console.log('会社情報を更新:', info);
            
            const updatedData = {
              ...prev,
              companyName: info.companyName || prev.companyName,
              businessContent,
              notes,
              tags: data.tags || prev.tags || [],
              emails: info.email ? [info.email, ...prev.emails.filter((e: string) => e !== info.email)].slice(0, 6) : prev.emails,
              phones: info.phone ? [info.phone, ...prev.phones.filter((p: string) => p !== info.phone)].slice(0, 6) : prev.phones
            };
            
            console.log('更新後のフォームデータ:', updatedData);
            return updatedData;
          }
          
          const updatedData = { ...prev, businessContent, notes, tags: data.tags || prev.tags || [] };
          console.log('更新後のフォームデータ:', updatedData);
          return updatedData;
        });
      } catch (error: any) {
        console.error('===== URL解析エラー =====');
        console.error('エラータイプ:', error.name);
        console.error('エラーメッセージ:', error.message);
        console.error('スタックトレース:', error.stack);
        
        // ユーザーにエラーを通知
        const errorMessage = error.name === 'AbortError' 
          ? 'URL情報の取得がタイムアウトしました（30秒）'
          : 'URL情報の取得に失敗しました';
        
        const fullMessage = `${errorMessage}\n\nエラー詳細:\n${error.message}\n\nネットワーク接続を確認してください`;
        
        alert(fullMessage);
      } finally {
        setFetchingUrls(prev => prev.filter(u => !validUrls.includes(u)));
        console.log('===== fetchUrlInfo終了 =====');
      }
    } 
    // この部分は実行されない（上の条件ですべて処理される）
    else if (false) { // 単一URLの処理も上で統合されたため無効化
      const url = validUrls[0];
      setFetchingUrls(prev => [...prev, url]);
      
      try {
        const response = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          // モバイル用にタイムアウトを設定
          signal: AbortSignal.timeout(20000) // 20秒のタイムアウト
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`URL情報取得完了 - ${url}:`, data);
          
          setFormData(prev => {
            let businessContent = prev.businessContent;
            let notes = prev.notes;
            
            // 事業内容を追加
            if (data.businessContent) {
              businessContent = businessContent 
                ? `${businessContent}\n\n【${url}】\n${data.businessContent}`.trim()
                : `【${url}】\n${data.businessContent}`;
            }
            
            // メモに要約を追加
            const summary = data.summary || '情報を取得できませんでした';
            const additionalInfo = data.additionalInfo ? `\n追加情報: ${data.additionalInfo}` : '';
            notes = notes 
              ? `${notes}\n\n【${url}の要約】\n${summary}${additionalInfo}`.trim()
              : `【${url}の要約】\n${summary}${additionalInfo}`;
            
            return { ...prev, businessContent, notes };
          });
        }
      } catch (error: any) {
        console.error(`URL情報取得エラー (${url}):`, error);
        
        // ユーザーにエラーを通知
        const errorMessage = error.name === 'AbortError' 
          ? `${url} の取得がタイムアウトしました`
          : `${url} の情報取得に失敗しました`;
        
        setFormData(prev => ({
          ...prev,
          notes: prev.notes 
            ? `${prev.notes}\n\n⚠️ ${errorMessage}`
            : `⚠️ ${errorMessage}`
        }));
      } finally {
        setFetchingUrls(prev => prev.filter(u => u !== url));
      }
    }
  };

  const analyzeWithAI = async () => {
    console.log('🔍 analyzeWithAI開始');
    if (!uploadedImages.front) {
      console.log('🔍 表面画像がないため処理中止');
      return;
    }

    setIsAnalyzing(true);
    console.log('🔍 AI解析開始、step を review に変更予定');

    try {
      // QRコードスキャン
      const qrUrls: string[] = [];
      const frontQr = await scanQRCode(uploadedImages.front);
      if (frontQr) {
        console.log('表面QRコード検出:', frontQr);
        qrUrls.push(frontQr);
      }
      
      if (uploadedImages.back) {
        const backQr = await scanQRCode(uploadedImages.back);
        if (backQr) {
          console.log('裏面QRコード検出:', backQr);
          qrUrls.push(backQr);
        }
      }
      
      if (qrUrls.length === 0) {
        console.log('QRコードは検出されませんでした');
      }

      // AI解析APIを呼び出す
      console.log('画像解析APIを呼び出し中...');
      const response = await fetch('/api/analyze-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          frontImage: uploadedImages.front.split(',')[1],
          backImage: uploadedImages.back ? uploadedImages.back.split(',')[1] : null
        })
      });

      const result = await response.json();
      console.log('AI解析結果:', result);
      
      // エラーチェック
      if (!response.ok || result.error) {
        console.error('APIエラー:', result);
        const errorMessage = result.details || result.error || 'AI解析に失敗しました';
        throw new Error(errorMessage);
      }
      
      // QRコードのURLと解析結果のURLを結合
      const combinedUrls = [...new Set([...qrUrls, ...(result.urls || [])])];
      console.log('統合されたURL一覧:', combinedUrls);

      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        companyName: result.companyName || prev.companyName,
        title: result.title || prev.title,
        urls: combinedUrls.slice(0, 6),
        emails: result.emails || [],
        phones: result.phones || [],
        line_ids: result.line_ids || [],
        notes: result.other_info || prev.notes,
        exchangeDate: prev.exchangeDate
      }));

      setStep('review');
      
      // URLは手動で取得ボタンを押すまで自動取得しない
      if (combinedUrls.length > 0) {
        console.log('取得したURL一覧:', combinedUrls);
        console.log('URLの情報を取得するには、各URLの横にあるボタンをクリックしてください');
      }
    } catch (error: any) {
      console.error('AI解析エラー:', error);
      console.error('エラー詳細:', error.message);
      
      // ユーザー向けのエラーメッセージ
      let userMessage = '画像の解析に失敗しました。';
      if (error.message.includes('APIキー')) {
        userMessage += '\nGemini APIキーの設定を確認してください。';
      } else if (error.message.includes('利用制限')) {
        userMessage += '\nAPIの利用制限に達しました。しばらく待ってから再試行してください。';
      }
      userMessage += '\n手動で入力してください。';
      
      alert(userMessage);
      setStep('review');
      setIsManualEdit(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    console.log('===== 保存処理開始 =====');
    console.log('現在のユーザー:', user?.uid);
    console.log('認証状態:', !!user);
    
    // 認証チェック
    if (!user || !user.uid) {
      console.error('ユーザーが認証されていません');
      console.error('User object:', user);
      alert('ログインが必要です。ログイン画面に移動します。');
      router.push('/auth');
      return;
    }

    // 必須項目チェック
    if (!formData.name || !formData.companyName) {
      alert('氏名と会社名は必須項目です。');
      return;
    }

    // 保存処理
    try {
      // データの準備
      const docData = {
        ...formData,
        // 空配列を除外
        urls: formData.urls.filter(url => url && url.trim()),
        emails: formData.emails.filter(email => email && email.trim()),
        phones: formData.phones.filter(phone => phone && phone.trim()),
        line_ids: formData.line_ids.filter(id => id && id.trim()),
        // タイムスタンプ
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // ユーザーID
        userId: user.uid
      };
      
      console.log('保存するデータ:', JSON.stringify(docData, null, 2));
      console.log('保存先パス:', `users/${user.uid}/cards`);
      console.log('Firestore接続確認中...');
      
      // Firestore接続確認
      const testCollection = collection(db, 'users', user.uid, 'cards');
      console.log('コレクション参照作成成功:', testCollection);
      
      // データ保存
      console.log('addDoc実行中...');
      const docRef = await addDoc(testCollection, docData);
      
      console.log('===== 保存成功 =====');
      console.log('Document ID:', docRef.id);
      console.log('Document Path:', docRef.path);
      
      alert('名刺を保存しました！');
      router.push('/dashboard');
    } catch (error) {
      const err = error as any;
      console.error('===== 保存エラー =====');
      console.error('エラーオブジェクト:', error);
      console.error('エラーコード:', err?.code);
      console.error('エラーメッセージ:', err?.message);
      console.error('スタックトレース:', err?.stack);
      
      // エラーの種類に応じた処理
      if (err?.code === 'permission-denied') {
        console.error('権限エラー: Firestore Rulesを確認してください');
        alert(`保存権限がありません。\n\nFirebaseコンソールで以下を確認してください：\n1. Firestore Rulesが正しく設定されているか\n2. ユーザーが正しく認証されているか\n\nユーザーID: ${user.uid}`);
      } else if (err?.code === 'unavailable') {
        console.error('接続エラー: Firestoreに接続できません');
        alert('サーバーに接続できません。\nインターネット接続を確認してください。');
      } else if (err?.code === 'unauthenticated') {
        console.error('認証エラー: ユーザーが認証されていません');
        alert('認証が切れました。再度ログインしてください。');
        router.push('/auth');
      } else {
        alert(`保存に失敗しました。\n\nエラー内容: ${err?.message || '不明なエラー'}\n\n詳細はコンソールを確認してください。`);
      }
    }
  };

  const handleArrayChange = (field: keyof BusinessCard, index: number, value: string) => {
    const arr = [...(formData[field] as string[])];
    arr[index] = value;
    setFormData({ ...formData, [field]: arr });
  };

  const addArrayItem = (field: keyof BusinessCard) => {
    if ((formData[field] as string[]).length >= 6) {
      alert('最大6個まで登録できます。');
      return;
    }
    const arr = [...(formData[field] as string[]), ''];
    setFormData({ ...formData, [field]: arr });
  };

  const removeArrayItem = (field: keyof BusinessCard, index: number) => {
    const arr = (formData[field] as string[]).filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: arr });
  };

  const resetAndStartOver = () => {
    setStep('upload');
    setUploadedImages({ front: '', back: '' });
    setFormData({
      name: '',
      companyName: '',
      title: '',
      urls: [],
      emails: [],
      phones: [],
      line_ids: [],
      businessContent: '',
      exchangeDate: new Date().toISOString().split('T')[0],
      notes: '',
      frontImageBase64: '',
      backImageBase64: ''
    });
    setIsManualEdit(false);
  };


  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-200">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-4 sm:mb-6 flex justify-between items-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">名刺を追加</h2>
          <Link
            href="/dashboard"
            className="bg-gray-700 text-gray-300 rounded-lg py-2 px-3 sm:px-4 hover:bg-gray-600 flex items-center gap-2 text-sm sm:text-base"
          >
            <ArrowLeft size={18} />
            一覧に戻る
          </Link>
        </header>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* メインアップロードエリア */}
            <div 
              className={`bg-gray-800 p-8 rounded-lg transition-all ${
                isDragging ? 'ring-4 ring-blue-500 bg-gray-700' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!uploadedImages.front ? (
                <>
                  <h3 className="text-xl font-semibold text-white mb-6 text-center">
                    名刺の写真を撮影またはアップロード
                  </h3>
                  
                  {isDragging ? (
                    <div className="border-4 border-dashed border-blue-500 rounded-lg p-12 text-center">
                      <Upload size={64} className="mx-auto mb-4 text-blue-400" />
                      <p className="text-xl text-white font-medium">ここに画像をドロップ</p>
                      <p className="text-gray-400 mt-2">複数枚の画像を同時にドロップできます</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* カメラ撮影 */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'camera')}
                      className="hidden"
                    />
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 transition-colors"
                    >
                      <Camera size={36} className="sm:w-12 sm:h-12" />
                      <span className="text-base sm:text-lg font-medium">写真撮影</span>
                      <span className="text-xs sm:text-sm text-blue-200">表裏を撮影</span>
                    </button>

                    {/* ファイルアップロード */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'file')}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 transition-colors"
                    >
                      <Upload size={36} className="sm:w-12 sm:h-12" />
                      <span className="text-base sm:text-lg font-medium">ファイル選択</span>
                      <span className="text-xs sm:text-sm text-gray-400">複数枚可能</span>
                    </button>
                  </div>
                  )}

                  <p className="text-center text-gray-400 mt-6 text-sm">
                    ※ 名刺の表面（必須）と裏面（任意）をアップロードしてください<br />
                    ※ 画像ファイルをドラッグ&ドロップでもアップロード可能です
                  </p>
                </>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white text-center">
                    アップロードされた画像
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 表面 */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-300">表面</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSingleImageUpload(e, 'front')}
                          className="hidden"
                          id="front-reupload"
                        />
                        <label
                          htmlFor="front-reupload"
                          className="text-blue-400 hover:text-blue-300 cursor-pointer text-sm"
                        >
                          変更
                        </label>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadedImages.front}
                          alt="名刺表面"
                          className="max-w-full max-h-[300px] rounded"
                        />
                      </div>
                    </div>

                    {/* 裏面 */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-300">裏面</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSingleImageUpload(e, 'back')}
                          className="hidden"
                          id="back-upload"
                        />
                        <label
                          htmlFor="back-upload"
                          className="text-blue-400 hover:text-blue-300 cursor-pointer text-sm"
                        >
                          {uploadedImages.back ? '変更' : '追加'}
                        </label>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                        {uploadedImages.back ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={uploadedImages.back}
                            alt="名刺裏面"
                            className="max-w-full max-h-[300px] rounded"
                          />
                        ) : (
                          <div className="text-gray-500 text-center">
                            <Upload size={32} className="mx-auto mb-2" />
                            <p className="text-sm">裏面画像（任意）</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4">
                    <p className="text-gray-200 text-sm">
                      ✓ 表面画像: {uploadedImages.front ? 'アップロード済み' : '未アップロード'}
                      <br />
                      ✓ 裏面画像: {uploadedImages.back ? 'アップロード済み' : '未アップロード（任意）'}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={resetAndStartOver}
                      className="bg-gray-600 text-white rounded-lg py-3 px-6 hover:bg-gray-700 transition-colors"
                    >
                      最初から撮り直す
                    </button>
                    <button
                      onClick={analyzeWithAI}
                      disabled={isAnalyzing || !uploadedImages.front}
                      className="bg-indigo-600 text-white rounded-lg py-3 px-8 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          処理中...
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} />
                          AIで情報を読み取る
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 処理中のオーバーレイ */}
            {isAnalyzing && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-8 rounded-lg text-center">
                  <div className="loader mx-auto mb-4"></div>
                  <p className="text-white text-lg">AIが名刺を解析中...</p>
                  <p className="text-gray-400 text-sm mt-2">しばらくお待ちください</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {isManualEdit ? '情報を入力' : '解析結果を確認'}
                </h3>
                <button
                  onClick={() => setIsManualEdit(!isManualEdit)}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                >
                  <Edit2 size={18} />
                  {isManualEdit ? '自動入力に戻る' : '手動で編集'}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      氏名 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      会社名 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">役職</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-300">
                      URL / ウェブサイト
                      {fetchingUrls.length > 0 && (
                        <span className="ml-2 text-blue-400 text-xs">
                          <Loader2 className="inline w-3 h-3 animate-spin mr-1" />
                          {fetchingUrls.length}件取得中...
                        </span>
                      )}
                    </label>
                    {formData.urls.filter(u => u).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('URL情報取得ボタンがクリックされました');
                          const validUrls = formData.urls.filter(u => u && !fetchingUrls.includes(u));
                          console.log('有効URL:', validUrls);
                          if (validUrls.length > 0) {
                            fetchUrlInfo(validUrls);
                          } else {
                            alert('URLを入力してください');
                          }
                        }}
                        disabled={fetchingUrls.length > 0}
                        className="bg-blue-600 text-white text-xs rounded px-3 py-1 hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Globe size={14} />
                        {formData.urls.filter(u => u).length > 1 ? '全URL情報を一括取得' : 'URL情報を取得'}
                      </button>
                    )}
                  </div>
                  {formData.urls.map((url, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => handleArrayChange('urls', index, e.target.value)}
                        onBlur={() => {
                          if (url && !fetchingUrls.includes(url)) {
                            fetchUrlInfo([url]);
                          }
                        }}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                        placeholder="https://example.com"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          console.log('個別URLボタンクリック:', url);
                          if (url && !fetchingUrls.includes(url)) {
                            console.log('fetchUrlInfoを呼び出します:', url);
                            fetchUrlInfo([url]);
                          } else {
                            console.log('URLが空または取得中:', url, fetchingUrls);
                            if (!url) alert('URLを入力してください');
                            if (fetchingUrls.includes(url)) alert('このURLは現在取得中です');
                          }
                        }}
                        disabled={!url || fetchingUrls.includes(url)}
                        className="text-blue-400 hover:text-blue-300 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="URLから情報を取得"
                      >
                        <Globe size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeArrayItem('urls', index)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  {formData.urls.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addArrayItem('urls')}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + URLを追加
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleArrayChange('emails', index, e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                        placeholder="example@email.com"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('emails', index)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  {formData.emails.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addArrayItem('emails')}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + メールアドレスを追加
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">電話番号</label>
                  {formData.phones.map((phone, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handleArrayChange('phones', index, e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                        placeholder="090-1234-5678"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('phones', index)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  {formData.phones.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addArrayItem('phones')}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      + 電話番号を追加
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">事業内容</label>
                  <textarea
                    value={formData.businessContent}
                    onChange={(e) => setFormData({ ...formData, businessContent: e.target.value })}
                    rows={6}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white resize-y min-h-[150px]"
                    placeholder="事業内容や取り扱い商品・サービスなど"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">メモ</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={8}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white resize-y min-h-[200px]"
                    placeholder="その他の情報やメモ"
                  />
                </div>

                <div className="flex gap-4 justify-end pt-4">
                  <button
                    onClick={resetAndStartOver}
                    className="bg-gray-600 text-white rounded-lg py-2 px-6 hover:bg-gray-700 transition-colors"
                  >
                    最初からやり直す
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="bg-green-600 text-white rounded-lg py-2 px-8 hover:bg-green-700 flex items-center gap-2 transition-colors"
                  >
                    <Check size={20} />
                    保存
                  </button>
                </div>
              </div>
            </div>

            {/* 画像プレビュー */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400 mb-3">アップロードされた画像</h4>
              <div className="grid grid-cols-2 gap-4">
                {uploadedImages.front && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImages.front}
                      alt="表面"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
                {uploadedImages.back && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImages.back}
                      alt="裏面"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        <style jsx>{`
        .loader {
          border: 4px solid #4a5568;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}</style>
      </div>
    </>
  );
}