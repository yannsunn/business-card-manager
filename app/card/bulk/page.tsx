'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Upload, Sparkles, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import jsQR from 'jsqr';

interface CardData {
  id: string;
  frontImage: string;
  backImage?: string;
  processed: boolean;
  data: Partial<BusinessCard>;
}

export default function BulkUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    };

    // 画像を2枚ずつグループ化（表・裏）
    const newCards: CardData[] = [];
    for (let i = 0; i < files.length; i += 2) {
      const frontImage = await readFile(files[i]);
      const backImage = files[i + 1] ? await readFile(files[i + 1]) : undefined;
      
      newCards.push({
        id: `card-${Date.now()}-${i}`,
        frontImage,
        backImage,
        processed: false,
        data: {
          name: '',
          companyName: '',
          title: '',
          emails: [],
          phones: [],
          urls: [],
          line_ids: [],
          notes: '',
          exchangeDate: new Date().toISOString().split('T')[0],
          frontImageBase64: frontImage,
          backImageBase64: backImage
        }
      });
    }

    setCards(newCards);
    if (newCards.length > 0) {
      processAllCards(newCards);
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

  const processAllCards = async (cardsToProcess: CardData[]) => {
    setIsProcessing(true);

    for (let i = 0; i < cardsToProcess.length; i++) {
      const card = cardsToProcess[i];
      
      try {
        // QRコードスキャン
        const qrUrls: string[] = [];
        const frontQr = await scanQRCode(card.frontImage);
        if (frontQr) qrUrls.push(frontQr);
        
        if (card.backImage) {
          const backQr = await scanQRCode(card.backImage);
          if (backQr) qrUrls.push(backQr);
        }

        // AI解析
        const response = await fetch('/api/analyze-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frontImage: card.frontImage.split(',')[1],
            backImage: card.backImage ? card.backImage.split(',')[1] : null
          })
        });

        if (response.ok) {
          const result = await response.json();
          const combinedUrls = [...new Set([...qrUrls, ...(result.urls || [])])];
          
          const updatedCard = {
            ...card,
            processed: true,
            data: {
              ...card.data,
              name: result.name || '',
              companyName: result.companyName || '',
              title: result.title || '',
              emails: result.emails || [],
              phones: result.phones || [],
              urls: combinedUrls.slice(0, 6),
              line_ids: result.line_ids || [],
              notes: result.other_info || ''
            }
          };

          setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));
        }
      } catch (error) {
        console.error(`カード${i + 1}の処理エラー:`, error);
        // エラーでも処理済みとしてマーク
        setCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, processed: true } : c
        ));
      }
    }

    setIsProcessing(false);
  };

  const updateCardData = (field: keyof BusinessCard, value: unknown) => {
    setCards(prev => prev.map((card, index) => 
      index === currentCardIndex 
        ? { ...card, data: { ...card.data, [field]: value } }
        : card
    ));
  };

  const removeCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
    if (currentCardIndex >= cards.length - 1 && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const saveAllCards = async () => {
    if (!user) return;
    
    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const card of cards) {
      if (!card.data.name || !card.data.companyName) {
        errorCount++;
        continue;
      }

      try {
        await addDoc(collection(db, 'users', user.uid, 'cards'), {
          ...card.data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        successCount++;
      } catch (error) {
        console.error('保存エラー:', error);
        errorCount++;
      }
    }

    setIsSaving(false);
    
    if (successCount > 0) {
      alert(`${successCount}件の名刺を保存しました${errorCount > 0 ? `（${errorCount}件失敗）` : ''}`);
      router.push('/dashboard');
    } else {
      alert('保存に失敗しました。');
    }
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">名刺一括アップロード</h2>
            <p className="text-gray-400 mt-2">複数の名刺をまとめて登録</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-700 text-gray-300 rounded-lg py-2 px-4 hover:bg-gray-600 flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            一覧に戻る
          </Link>
        </header>

        {cards.length === 0 ? (
          <div className="bg-gray-800 p-12 rounded-lg text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors"
            >
              <Upload size={64} />
              <span className="text-xl font-medium">名刺画像を選択</span>
              <span className="text-sm text-blue-200">複数枚選択可能（表・裏を交互に）</span>
            </button>
            <p className="text-gray-400 mt-6 text-sm">
              ※ 表面、裏面、表面、裏面...の順番で選択してください<br />
              裏面がない場合は表面のみでも可
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* プログレスバー */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">
                  処理状況: {cards.filter(c => c.processed).length} / {cards.length} 枚
                </span>
                {isProcessing && (
                  <span className="text-blue-400 text-sm flex items-center gap-2">
                    <Sparkles size={16} className="animate-pulse" />
                    AI解析中...
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(cards.filter(c => c.processed).length / cards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* カード編集エリア */}
            {currentCard && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    名刺 {currentCardIndex + 1} / {cards.length}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                      disabled={currentCardIndex === 0}
                      className="p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1))}
                      disabled={currentCardIndex === cards.length - 1}
                      className="p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button
                      onClick={() => removeCard(currentCardIndex)}
                      className="p-2 bg-red-600 rounded hover:bg-red-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 画像プレビュー */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">表面</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentCard.frontImage}
                        alt="表面"
                        className="w-full rounded-lg bg-gray-700"
                      />
                    </div>
                    {currentCard.backImage && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">裏面</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentCard.backImage}
                          alt="裏面"
                          className="w-full rounded-lg bg-gray-700"
                        />
                      </div>
                    )}
                  </div>

                  {/* データ編集フォーム */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        氏名 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentCard.data.name || ''}
                        onChange={(e) => updateCardData('name', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        会社名 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentCard.data.companyName || ''}
                        onChange={(e) => updateCardData('companyName', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">役職</label>
                      <input
                        type="text"
                        value={currentCard.data.title || ''}
                        onChange={(e) => updateCardData('title', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
                      <input
                        type="email"
                        value={currentCard.data.emails?.[0] || ''}
                        onChange={(e) => updateCardData('emails', [e.target.value])}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                        placeholder="example@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">電話番号</label>
                      <input
                        type="tel"
                        value={currentCard.data.phones?.[0] || ''}
                        onChange={(e) => updateCardData('phones', [e.target.value])}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                        placeholder="090-1234-5678"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">メモ</label>
                      <textarea
                        value={currentCard.data.notes || ''}
                        onChange={(e) => updateCardData('notes', e.target.value)}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* カードサムネイル一覧 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-400 mb-3">アップロードされた名刺</h3>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => setCurrentCardIndex(index)}
                    className={`relative aspect-[3/2] rounded overflow-hidden border-2 ${
                      index === currentCardIndex ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.frontImage}
                      alt={`名刺 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {card.processed && (
                      <div className="absolute top-1 right-1 bg-green-600 rounded-full p-1">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    {(!card.data.name || !card.data.companyName) && card.processed && (
                      <div className="absolute inset-0 bg-red-600 bg-opacity-20" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCards([])}
                className="bg-gray-600 text-white rounded-lg py-2 px-6 hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={saveAllCards}
                disabled={isProcessing || isSaving || cards.some(c => !c.processed)}
                className="bg-green-600 text-white rounded-lg py-2 px-8 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>保存中...</>
                ) : (
                  <>
                    <Check size={20} />
                    すべて保存
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}