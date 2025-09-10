'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<BusinessCard>({} as BusinessCard);
  const [cardId, setCardId] = useState<string>('');

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCardId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    if (!cardId || cardId === 'new') return;

    const fetchCard = async () => {
      try {
        const cardDoc = await getDoc(doc(db, 'users', user.uid, 'cards', cardId));
        if (cardDoc.exists()) {
          const cardData = { id: cardDoc.id, ...cardDoc.data() } as BusinessCard;
          setCard(cardData);
          setEditData(cardData);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching card:', error);
        router.push('/dashboard');
      }
    };

    fetchCard();
  }, [user, cardId, router]);

  const handleUpdate = async () => {
    if (!user || !card?.id) return;

    try {
      const { ...updateData } = editData;
      await updateDoc(doc(db, 'users', user.uid, 'cards', card.id), {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      setCard(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました。');
    }
  };

  const handleDelete = async () => {
    if (!user || !card?.id) return;
    
    if (confirm('本当に削除しますか？')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'cards', card.id));
        router.push('/dashboard');
      } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました。');
      }
    }
  };

  const handleArrayChange = (field: keyof BusinessCard, index: number, value: string) => {
    const arr = [...(editData[field] as string[])];
    arr[index] = value;
    setEditData({ ...editData, [field]: arr });
  };

  const addArrayItem = (field: keyof BusinessCard) => {
    const arr = [...(editData[field] as string[]), ''];
    setEditData({ ...editData, [field]: arr });
  };

  const removeArrayItem = (field: keyof BusinessCard, index: number) => {
    const arr = (editData[field] as string[]).filter((_, i) => i !== index);
    setEditData({ ...editData, [field]: arr });
  };

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <header className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">
            {isEditing ? '名刺編集' : '名刺詳細'}
          </h2>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-yellow-600 text-white rounded-lg py-2 px-4 hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Edit size={18} />
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white rounded-lg py-2 px-4 hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  削除
                </button>
              </>
            )}
            <Link
              href="/dashboard"
              className="bg-gray-700 text-gray-300 rounded-lg py-2 px-4 hover:bg-gray-600 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              一覧に戻る
            </Link>
          </div>
        </header>

        <div className="bg-gray-800 p-6 rounded-lg">
          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">氏名 *</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">会社名 *</label>
                <input
                  type="text"
                  value={editData.companyName}
                  onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">役職</label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
                {editData.emails?.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleArrayChange('emails', index, e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">ウェブサイト</label>
                {editData.urls?.map((url, index) => (
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
                  + URLを追加
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">電話番号</label>
                {editData.phones?.map((phone, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handleArrayChange('phones', index, e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">事業内容</label>
                <textarea
                  value={editData.businessContent || ''}
                  onChange={(e) => setEditData({ ...editData, businessContent: e.target.value })}
                  rows={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white resize-y min-h-[150px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">タグ</label>
                <div className="space-y-2">
                  {(editData.tags || []).map((tag, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem('tags', index)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('tags')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    + タグを追加
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">メモ</label>
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={8}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white resize-y min-h-[200px]"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded-lg py-2 px-5 hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditData(card); }}
                  className="bg-gray-600 text-white rounded-lg py-2 px-5 hover:bg-gray-700"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                {card.frontImageBase64 && (
                  <div>
                    <p className="text-lg font-semibold text-white mb-2">名刺画像（表）</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.frontImageBase64} alt="名刺表面" className="w-full rounded-lg" />
                  </div>
                )}
                {card.backImageBase64 && (
                  <div>
                    <p className="text-lg font-semibold text-white mb-2">名刺画像（裏）</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.backImageBase64} alt="名刺裏面" className="w-full rounded-lg" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{card.name}</h3>
                  <p className="text-lg text-gray-300">
                    {card.companyName} {card.title ? `/ ${card.title}` : ''}
                  </p>
                </div>

                {card.emails && card.emails.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-400 mb-2">メールアドレス</h4>
                    <ul className="space-y-1">
                      {card.emails.map((email, index) => (
                        <li key={index}>{email}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {card.phones && card.phones.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-400 mb-2">電話番号</h4>
                    <ul className="space-y-1">
                      {card.phones.map((phone, index) => (
                        <li key={index}>{phone}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {card.urls && card.urls.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-400 mb-2">Webサイト・リンク</h4>
                    <ul className="space-y-1">
                      {card.urls.map((url, index) => (
                        <li key={index}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {card.businessContent && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-400 mb-2">事業内容</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{card.businessContent}</p>
                  </div>
                )}

                {card.tags && card.tags.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-400 mb-2">タグ</h4>
                    <div className="flex flex-wrap gap-2">
                      {card.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-700 text-sm px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {card.notes && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-400 mb-2">メモ</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{card.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}