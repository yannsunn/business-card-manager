'use client';

import { useState, useEffect } from 'react';
import { X, Users, TrendingUp, Building, Loader2 } from 'lucide-react';
import { BusinessCard } from '@/types';

interface MatchingResult {
  id: string;
  companyName: string;
  matchScore: number;
  matchReasons: string[];
  potentialCollaboration: string;
}

interface MatchingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCard: BusinessCard | null;
  allCards: BusinessCard[];
}

export function MatchingDialog({ isOpen, onClose, sourceCard, allCards }: MatchingDialogProps) {
  const [matches, setMatches] = useState<MatchingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sourceCard) {
      findMatches();
    }
  }, [isOpen, sourceCard]);

  const findMatches = async () => {
    if (!sourceCard) return;

    setIsLoading(true);
    setError(null);

    try {
      // 自分以外のカードを取得
      const targetCards = allCards
        .filter(card => card.id !== sourceCard.id)
        .map(card => ({
          id: card.id || '',
          companyName: card.companyName,
          businessContent: card.businessContent || '',
          tags: card.tags || []
        }));

      if (targetCards.length === 0) {
        setError('マッチング対象の企業がありません');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCard: {
            companyName: sourceCard.companyName,
            businessContent: sourceCard.businessContent || '',
            tags: sourceCard.tags || []
          },
          targetCards
        })
      });

      if (!response.ok) {
        throw new Error('マッチング分析に失敗しました');
      }

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('マッチングエラー:', err);
      setError('マッチング分析中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '非常に高い';
    if (score >= 60) return '良好';
    if (score >= 40) return '可能性あり';
    if (score >= 20) return '限定的';
    return '低い';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">企業マッチング分析</h2>
              <p className="text-sm text-gray-600 mt-1">
                {sourceCard?.companyName} のマッチング候補
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">マッチング候補を分析中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : matches.length > 0 ? (
            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <h3 className="font-semibold text-lg">{match.companyName}</h3>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(match.matchScore)}`}>
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        {match.matchScore}% - {getScoreLabel(match.matchScore)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">マッチング理由</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {match.matchReasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">想定される協業内容</h4>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                        {match.potentialCollaboration}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">マッチング候補が見つかりませんでした</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}