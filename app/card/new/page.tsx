'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Upload, Sparkles } from 'lucide-react';
import jsQR from 'jsqr';

export default function NewCardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<BusinessCard>({
    name: '',
    companyName: '',
    title: '',
    urls: [],
    emails: [],
    phones: [],
    line_ids: [],
    businessContent: '',
    exchangeDate: '',
    notes: '',
    frontImageBase64: '',
    backImageBase64: ''
  });

  const [frontImage, setFrontImage] = useState<string>('');
  const [backImage, setBackImage] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    };

    if (files[0]) {
      const base64 = await readFile(files[0]);
      setFrontImage(base64);
      setFormData(prev => ({ ...prev, frontImageBase64: base64 }));
    }

    if (files[1]) {
      const base64 = await readFile(files[1]);
      setBackImage(base64);
      setFormData(prev => ({ ...prev, backImageBase64: base64 }));
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

  const analyzeWithAI = async () => {
    if (!frontImage) {
      alert('画像をアップロードしてください。');
      return;
    }

    setIsAnalyzing(true);

    try {
      // QRコードスキャン
      const qrUrls: string[] = [];
      const frontQr = await scanQRCode(frontImage);
      if (frontQr) qrUrls.push(frontQr);
      
      if (backImage) {
        const backQr = await scanQRCode(backImage);
        if (backQr) qrUrls.push(backQr);
      }

      // AI解析APIを呼び出す
      const response = await fetch('/api/analyze-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          frontImage: frontImage.split(',')[1],
          backImage: backImage ? backImage.split(',')[1] : null
        })
      });

      if (!response.ok) throw new Error('AI解析に失敗しました');

      const result = await response.json();
      
      // QRコードのURLと解析結果のURLを結合
      const combinedUrls = [...new Set([...qrUrls, ...(result.urls || [])])];

      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        companyName: result.companyName || prev.companyName,
        title: result.title || prev.title,
        urls: combinedUrls.slice(0, 6),
        emails: result.emails || [],
        phones: result.phones || [],
        line_ids: result.line_ids || [],
        notes: result.other_info || prev.notes
      }));

      alert('画像の解析が完了しました。内容を確認してください。');
    } catch (error) {
      console.error('AI解析エラー:', error);
      alert('画像の解析に失敗しました。手動で入力してください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <header className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">新規名刺登録</h2>
          <Link
            href="/dashboard"
            className="bg-gray-700 text-gray-300 rounded-lg py-2 px-4 hover:bg-gray-600 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            一覧に戻る
          </Link>
        </header>

        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-bold text-white mb-4">1. 名刺画像をアップロード</h3>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
          >
            {!frontImage && !backImage ? (
              <>
                <Upload size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">
                  画像をクリックして選択（最大2枚）<br />
                  またはドラッグ＆ドロップ
                </p>
              </>
            ) : (
              <div className="flex gap-4 justify-center">
                {frontImage && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={frontImage} alt="表面" className="max-h-40 rounded" />
                    <p className="text-sm mt-2">表面</p>
                  </div>
                )}
                {backImage && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={backImage} alt="裏面" className="max-h-40 rounded" />
                    <p className="text-sm mt-2">裏面</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {frontImage && (
            <button
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              className="mt-4 w-full bg-indigo-600 text-white rounded-lg py-3 px-6 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              {isAnalyzing ? 'AIで解析中...' : 'AIで画像を解析して入力'}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4">2. 内容を確認・修正</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">氏名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">会社名 *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                required
              />
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
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('emails')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + メールアドレスを追加
              </button>
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
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('phones')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + 電話番号を追加
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Webサイト・リンク</label>
              {formData.urls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleArrayChange('urls', index, e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                    placeholder="https://example.com"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('urls', index)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('urls')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + リンクを追加
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">事業内容</label>
              <textarea
                value={formData.businessContent}
                onChange={(e) => setFormData({ ...formData, businessContent: e.target.value })}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">交換日</label>
              <input
                type="date"
                value={formData.exchangeDate}
                onChange={(e) => setFormData({ ...formData, exchangeDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">メモ</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                placeholder="AIによる解析情報がここに追記されます"
              />
            </div>

            <div className="text-right">
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-lg py-2 px-5 hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}