'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import { Plus, Search, LogOut, Upload } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<BusinessCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const cardsCollection = collection(db, 'users', user.uid, 'cards');
    const q = query(cardsCollection);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BusinessCard));
      setCards(cardsData);
      setFilteredCards(cardsData);
    });

    return () => unsubscribe();
  }, [user, router]);

  useEffect(() => {
    const filtered = cards.filter(card => 
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCards(filtered);
  }, [searchTerm, cards]);

  // 未使用の関数を削除（削除機能は詳細ページに移動）
  // const handleDelete = async (cardId: string) => {
  //   if (!user || !cardId) return;
  //   
  //   if (confirm('本当に削除しますか？')) {
  //     try {
  //       await deleteDoc(doc(db, 'users', user.uid, 'cards', cardId));
  //     } catch (error) {
  //       console.error('削除エラー:', error);
  //       alert('削除に失敗しました。');
  //     }
  //   }
  // };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">名刺管理システム</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-700 text-white rounded-lg py-2 px-4 hover:bg-gray-600 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            ログアウト
          </button>
        </header>

        <div className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="氏名、会社名などで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 sm:py-3 pl-10 pr-4 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4">
          {filteredCards.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              まだ名刺が登録されていません。
            </p>
          ) : (
            filteredCards.map((card) => (
              <Link
                key={card.id}
                href={`/card/${card.id}`}
                className="bg-gray-800 p-3 sm:p-4 rounded-lg flex items-center justify-between hover:bg-gray-700 transition-colors block"
              >
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold text-base sm:text-lg text-white truncate">
                    {card.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {card.companyName} {card.title ? `/ ${card.title}` : ''}
                  </p>
                </div>
                <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
                  <p className="text-xs sm:text-sm text-gray-300">
                    <span className="hidden sm:inline">交換日: </span>
                    <span className="sm:hidden">{card.exchangeDate?.substring(5) || '-'}</span>
                    <span className="hidden sm:inline">{card.exchangeDate || '未設定'}</span>
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* フローティングアクションボタン */}
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col gap-3">
          <Link
            href="/card/bulk"
            className="bg-green-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-green-700 group relative"
            title="一括アップロード"
          >
            <Upload size={20} className="sm:w-6 sm:h-6" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              一括アップロード
            </span>
          </Link>
          <Link
            href="/card/new"
            className="bg-blue-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-blue-700 group relative"
            title="名刺を追加"
          >
            <Plus size={20} className="sm:w-6 sm:h-6" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              名刺を追加
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}