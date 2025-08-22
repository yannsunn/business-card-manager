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
    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    };

    // 最初の画像を表面として設定
    if (files[0]) {
      const base64 = await readFile(files[0]);
      setUploadedImages(prev => ({ ...prev, front: base64 }));
      setFormData(prev => ({ ...prev, frontImageBase64: base64 }));
    }

    // 2枚目があれば裏面として設定
    if (files[1]) {
      const base64 = await readFile(files[1]);
      setUploadedImages(prev => ({ ...prev, back: base64 }));
      setFormData(prev => ({ ...prev, backImageBase64: base64 }));
    }
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

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImages(prev => ({ ...prev, [side]: base64 }));
      setFormData(prev => ({ 
        ...prev, 
        [`${side}ImageBase64`]: base64 
      }));
    };
    reader.readAsDataURL(file);
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
    // 複数URLを並列で処理
    const fetchPromises = urls.map(async (url) => {
      if (!url || fetchingUrls.includes(url)) return null;
      
      setFetchingUrls(prev => [...prev, url]);
      
      try {
        const response = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          const data = await response.json();
          return { url, data };
        }
      } catch (error) {
        console.error(`URL情報取得エラー (${url}):`, error);
      } finally {
        setFetchingUrls(prev => prev.filter(u => u !== url));
      }
      return null;
    });

    // 全てのURLの取得を待つ
    const results = await Promise.all(fetchPromises);
    
    // 取得した情報をまとめて更新
    setFormData(prev => {
      let businessContent = prev.businessContent;
      let notes = prev.notes;
      
      results.forEach(result => {
        if (result) {
          const { url, data } = result;
          console.log(`URL情報取得完了 - ${url}:`, data);
          
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
        }
      });
      
      return { ...prev, businessContent, notes };
    });
  };

  const analyzeWithAI = async () => {
    if (!uploadedImages.front) return;

    setIsAnalyzing(true);

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
      const response = await fetch('/api/analyze-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          frontImage: uploadedImages.front.split(',')[1],
          backImage: uploadedImages.back ? uploadedImages.back.split(',')[1] : null
        })
      });

      if (!response.ok) throw new Error('AI解析に失敗しました');

      const result = await response.json();
      console.log('AI解析結果:', result);
      
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
      
      // URLがある場合は自動的に情報を取得
      if (combinedUrls.length > 0) {
        console.log('取得したURL一覧:', combinedUrls);
        // 少し待ってから取得（UIが更新されるのを待つ）
        setTimeout(async () => {
          await fetchUrlInfo(combinedUrls);
        }, 500);
      }
    } catch (error) {
      console.error('AI解析エラー:', error);
      alert('画像の解析に失敗しました。手動で入力してください。');
      setStep('review');
      setIsManualEdit(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.name || !formData.companyName) {
      alert('氏名と会社名は必須項目です。');
      return;
    }

    try {
      const docData = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users', user.uid, 'cards'), docData);
      router.push('/dashboard');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました。');
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
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <header className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">名刺を追加</h2>
          <Link
            href="/dashboard"
            className="bg-gray-700 text-gray-300 rounded-lg py-2 px-4 hover:bg-gray-600 flex items-center gap-2"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors"
                    >
                      <Camera size={48} />
                      <span className="text-lg font-medium">カメラで撮影</span>
                      <span className="text-sm text-blue-200">表・裏を続けて撮影可能</span>
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
                      className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors"
                    >
                      <Upload size={48} />
                      <span className="text-lg font-medium">画像を選択</span>
                      <span className="text-sm text-gray-400">複数枚選択可能</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {formData.urls.filter(u => u).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const validUrls = formData.urls.filter(u => u && !fetchingUrls.includes(u));
                          if (validUrls.length > 0) {
                            fetchUrlInfo(validUrls);
                          }
                        }}
                        className="bg-blue-600 text-white text-xs rounded px-3 py-1 hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Globe size={14} />
                        全URL情報を一括取得
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
                          if (url && !fetchingUrls.includes(url)) {
                            fetchUrlInfo([url]);
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 px-2"
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
                    rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                    placeholder="事業内容や取り扱い商品・サービスなど"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">メモ</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
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
  );
}