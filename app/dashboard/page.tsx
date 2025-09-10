'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  onSnapshot,
  doc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import { Plus, Search, LogOut, Upload, RefreshCw, CheckSquare, Square, Tag, Download, Users, Mail } from 'lucide-react';
import Link from 'next/link';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useErrorNotification } from '@/components/ErrorNotification';
import { fromFirebaseError, ErrorCode } from '@/lib/errors';
import { useDebounce } from '@/hooks/useDebounce';
import { useCSRF } from '@/hooks/useCSRF';
import { useKeyboardNavigation, useAnnounce, useSkipToMain } from '@/hooks/useAccessibility';
import { Button } from '@/components/Button';
import { ExportDialog } from '@/components/ExportDialog';
import { MatchingDialog } from '@/components/MatchingDialog';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<BusinessCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedTagSearch = useDebounce(tagSearch, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [allTags, setAllTags] = useState<string[]>([]);
  const { handleError, withErrorHandling } = useErrorHandler();
  const { showError } = useErrorNotification();
  const { fetchWithCSRF } = useCSRF();
  const { announce } = useAnnounce();
  const { handleSkip } = useSkipToMain();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isMatchingDialogOpen, setIsMatchingDialogOpen] = useState(false);
  const [selectedCardForMatching, setSelectedCardForMatching] = useState<BusinessCard | null>(null);
  const { containerRef, focusedIndex } = useKeyboardNavigation(
    filteredCards.length,
    (index) => router.push(`/card/${filteredCards[index].id}`)
  );

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const cardsCollection = collection(db, 'users', user.uid, 'cards');
    const q = query(cardsCollection);
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        try {
          const cardsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as BusinessCard));
          setCards(cardsData);
          setFilteredCards(cardsData);
          setIsLoading(false);
          announce(`${cardsData.length}件の名刺を読み込みました`);

          // タグを集計
          const tagsSet = new Set<string>();
          cardsData.forEach(card => {
            card.tags?.forEach(tag => tagsSet.add(tag));
          });
          setAllTags(Array.from(tagsSet).sort());
        } catch (error) {
          handleError(error, { context: 'cards-fetch' });
          showError('名刺データの読み込みに失敗しました');
          setIsLoading(false);
        }
      },
      (error) => {
        const bcError = fromFirebaseError(error);
        handleError(bcError, { context: 'firestore-listener' });
        
        if (bcError.code === ErrorCode.FIREBASE_PERMISSION_DENIED) {
          showError('アクセス権限がありません。再度ログインしてください');
          router.push('/auth');
        } else {
          showError(bcError.message);
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, router, handleError, showError]);

  useEffect(() => {
    let filtered = cards;

    // デバウンスされた検索値を使用
    // 名前・会社名での検索
    if (debouncedSearchTerm) {
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        card.companyName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // タグでの検索
    if (debouncedTagSearch) {
      filtered = filtered.filter(card => 
        card.tags?.some(tag => tag.toLowerCase().includes(debouncedTagSearch.toLowerCase()))
      );
    }

    setFilteredCards(filtered);
  }, [debouncedSearchTerm, debouncedTagSearch, cards]);

  const handleSelectCard = (cardId: string) => {
    const newSelected = new Set(selectedCardIds);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCardIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCardIds.size === filteredCards.length) {
      setSelectedCardIds(new Set());
    } else {
      const allIds = new Set(filteredCards.map(card => card.id!).filter(Boolean));
      setSelectedCardIds(allIds);
    }
  };

  const handleBulkFetchInfo = async () => {
    if (selectedCardIds.size === 0 || !user) return;

    setIsBulkProcessing(true);
    
    try {
      const selectedCards = cards.filter(card => selectedCardIds.has(card.id!));
      const BATCH_SIZE = 3; // 3件ずつ並列処理
      
      setBulkProgress({ current: 0, total: selectedCards.length });
      
      for (let i = 0; i < selectedCards.length; i += BATCH_SIZE) {
        const batch = selectedCards.slice(i, i + BATCH_SIZE);
        
        // バッチ内で並列処理
        await Promise.allSettled(
          batch.map(async (card) => {
            if (card.urls && card.urls.length > 0) {
              try {
                // URL情報を取得（CSRF保護付き）
                const response = await fetchWithCSRF('/api/analyze-urls', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ urls: card.urls }),
                  signal: AbortSignal.timeout(30000) // 30秒タイムアウト
                });

                if (response.ok) {
                  const data = await response.json();
                  
                  // タグを自動生成
                  const tags = generateTags(data.businessContent || '', data.companyInfo);
                  
                  // トランザクションでカード情報を更新（競合状態を防ぐ）
                  await runTransaction(db, async (transaction) => {
                    const cardRef = doc(db, 'users', user.uid, 'cards', card.id!);
                    const cardDoc = await transaction.get(cardRef);
                    
                    if (!cardDoc.exists()) {
                      throw new Error('Card not found');
                    }
                    
                    transaction.update(cardRef, {
                      businessContent: data.businessContent || card.businessContent,
                      tags: tags,
                      updatedAt: new Date().toISOString()
                    });
                  });
                }
              } catch (error) {
                console.error(`Failed to fetch info for card ${card.id}:`, error);
              }
            }
            
            // 進捗を更新
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
          })
        );
      }
      
      setSelectedCardIds(new Set());
      announce('一括情報取得が完了しました', 'assertive');
    } catch (error) {
      handleError(error, { context: 'bulk-fetch' });
      showError('一括情報取得に失敗しました');
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const generateTags = (businessContent: string, _companyInfo?: any): string[] => {
    const tags = new Set<string>();
    const content = businessContent.toLowerCase();
    
    // ビジネスカテゴリの判定
    if (content.includes('sns') || content.includes('ソーシャル') || content.includes('マーケティング')) {
      tags.add('SNS運用会社');
    }
    if (content.includes('web') || content.includes('ウェブ') || content.includes('ホームページ')) {
      tags.add('WEB制作');
    }
    if (content.includes('システム') || content.includes('開発') || content.includes('ソフトウェア')) {
      tags.add('システム開発');
    }
    if (content.includes('ai') || content.includes('人工知能') || content.includes('機械学習')) {
      tags.add('AI関連');
    }
    if (content.includes('コンサル') || content.includes('戦略') || content.includes('支援')) {
      tags.add('コンサルティング');
    }
    if (content.includes('デザイン') || content.includes('クリエイティブ')) {
      tags.add('デザイン');
    }
    if (content.includes('教育') || content.includes('研修') || content.includes('トレーニング')) {
      tags.add('教育・研修');
    }
    if (content.includes('不動産') || content.includes('建築') || content.includes('建設')) {
      tags.add('不動産・建築');
    }
    if (content.includes('医療') || content.includes('ヘルスケア') || content.includes('健康')) {
      tags.add('医療・ヘルスケア');
    }
    if (content.includes('金融') || content.includes('投資') || content.includes('保険')) {
      tags.add('金融');
    }
    if (content.includes('ec') || content.includes('通販') || content.includes('eコマース')) {
      tags.add('EC・通販');
    }
    if (content.includes('広告') || content.includes('pr') || content.includes('プロモーション')) {
      tags.add('広告・PR');
    }
    
    return Array.from(tags);
  };

  const handleLogout = async () => {
    await withErrorHandling(
      async () => {
        await logout();
        router.push('/auth');
      },
      {
        context: { action: 'logout' },
        onError: () => {
          showError('ログアウトに失敗しました。再度お試しください');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <a
        href="#main-content"
        onClick={handleSkip}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50"
      >
        メインコンテンツへスキップ
      </a>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" role="banner">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white" id="page-title">名刺管理システム</h1>
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

        <main id="main-content" className="space-y-4 mb-4 sm:mb-6" role="main" aria-labelledby="page-title">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="氏名、会社名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 sm:py-3 pl-10 pr-4 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="タグで検索（例: SNS運用会社）..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 sm:py-3 pl-10 pr-4 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagSearch(tag)}
                  className="bg-gray-700 text-xs sm:text-sm px-3 py-2 sm:px-2 sm:py-1 rounded-full hover:bg-gray-600 transition-colors min-h-[32px] sm:min-h-0"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {filteredCards.length > 0 && (
            <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 min-h-[44px] px-2 -mx-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label={selectedCardIds.size === filteredCards.length ? '全ての選択を解除' : '全て選択'}
                aria-pressed={selectedCardIds.size === filteredCards.length}
              >
                {selectedCardIds.size === filteredCards.length ? <CheckSquare size={20} /> : <Square size={20} />}
                全て選択
              </button>
              <div className="flex gap-2">
                {selectedCardIds.size > 0 && (
                  <Button
                    onClick={handleBulkFetchInfo}
                    disabled={isBulkProcessing}
                    variant="primary"
                    size="sm"
                    aria-label={`${selectedCardIds.size}件の名刺の一括情報取得`}
                  >
                    {isBulkProcessing 
                      ? `処理中 (${bulkProgress.current}/${bulkProgress.total})`
                      : `一括情報取得 (${selectedCardIds.size}件)`}
                  </Button>
                )}
                <Button
                  onClick={() => setIsExportDialogOpen(true)}
                  variant="secondary"
                  size="sm"
                  aria-label="データをエクスポート"
                >
                  エクスポート
                </Button>
                <Link href="/email">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="お礼メール送信"
                  >
                    <Mail size={16} className="mr-1" />
                    お礼メール
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </main>

        <div className="space-y-4" ref={containerRef} role="region" aria-label="名刺一覧" aria-live="polite">
          {isLoading ? (
            <div className="text-center py-8" role="status" aria-label="読み込み中">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white" aria-hidden="true"></div>
              <p className="text-gray-400 mt-2">名刺を読み込んでいます...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <p className="text-gray-500 text-center py-8" role="status">
              {searchTerm || tagSearch ? '検索結果がありません。' : 'まだ名刺が登録されていません。'}
            </p>
          ) : (
            filteredCards.map((card, index) => (
              <div
                key={card.id}
                className={`bg-gray-800 p-3 sm:p-4 rounded-lg flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                  focusedIndex === index ? 'ring-2 ring-blue-500' : ''
                }`}
                role="article"
                aria-label={`名刺: ${card.name}, ${card.companyName}`}
                data-focusable="true"
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectCard(card.id!);
                  }}
                  className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={selectedCardIds.has(card.id!) ? `${card.name}の選択を解除` : `${card.name}を選択`}
                  aria-pressed={selectedCardIds.has(card.id!)}
                >
                  {selectedCardIds.has(card.id!) ? 
                    <CheckSquare size={24} className="text-blue-400" aria-hidden="true" /> : 
                    <Square size={24} className="text-gray-400" aria-hidden="true" />
                  }
                </button>
                <Link
                  href={`/card/${card.id}`}
                  className="flex-1 flex items-center justify-between overflow-hidden"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-base sm:text-lg text-white truncate">
                      {card.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">
                      {card.companyName} {card.title ? `/ ${card.title}` : ''}
                    </p>
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {card.tags.map(tag => (
                          <span key={tag} className="bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-2 sm:ml-4 flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedCardForMatching(card);
                        setIsMatchingDialogOpen(true);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 flex items-center gap-1"
                      aria-label={`${card.companyName}のマッチング候補を見る`}
                    >
                      <Users size={14} />
                      <span className="hidden sm:inline">マッチング</span>
                    </button>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-300">
                        <span className="hidden sm:inline">交換日: </span>
                        <span className="sm:hidden">{card.exchangeDate?.substring(5) || '-'}</span>
                        <span className="hidden sm:inline">{card.exchangeDate || '未設定'}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>

        <nav className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col gap-3" aria-label="クイックアクション">
          <Link
            href="/card/bulk"
            className="bg-green-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-green-700 group relative focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="一括アップロード"
          >
            <Upload size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              一括アップロード
            </span>
          </Link>
          <Link
            href="/card/new"
            className="bg-blue-600 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-blue-700 group relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="名刺を追加"
          >
            <Plus size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              名刺を追加
            </span>
          </Link>
        </nav>
        
        <ExportDialog
          cards={cards}
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
        />
        
        <MatchingDialog
          isOpen={isMatchingDialogOpen}
          onClose={() => {
            setIsMatchingDialogOpen(false);
            setSelectedCardForMatching(null);
          }}
          sourceCard={selectedCardForMatching}
          allCards={cards}
        />
      </div>
    </div>
  );
}