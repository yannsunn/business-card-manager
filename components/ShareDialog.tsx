'use client';

import React, { useState } from 'react';
import { Share2, Copy, Mail, Link, Users, Check, X } from 'lucide-react';
import { Button } from './Button';

interface ShareDialogProps {
  cardId: string;
  cardName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  cardId,
  cardName,
  isOpen,
  onClose
}) => {
  const [shareMethod, setShareMethod] = useState<'link' | 'email' | 'team'>('link');
  const [email, setEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/card/shared/${cardId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  };

  const shareViaEmail = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      // メール送信APIを呼び出す（実装例）
      const response = await fetch('/api/share/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          recipientEmail: email,
          shareUrl
        })
      });

      if (response.ok) {
        alert('共有リンクをメールで送信しました');
        onClose();
      }
    } catch (error) {
      console.error('メール送信エラー:', error);
      alert('メール送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const shareWithTeam = async () => {
    if (teamMembers.length === 0) return;
    
    setLoading(true);
    try {
      // チーム共有APIを呼び出す
      const response = await fetch('/api/share/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          memberIds: teamMembers
        })
      });

      if (response.ok) {
        alert('チームメンバーと共有しました');
        onClose();
      }
    } catch (error) {
      console.error('チーム共有エラー:', error);
      alert('チーム共有に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            名刺を共有
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 共有対象 */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">共有する名刺</p>
          <p className="font-medium">{cardName}</p>
        </div>

        {/* 共有方法の選択 */}
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShareMethod('link')}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                shareMethod === 'link'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Link className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">リンク</span>
            </button>
            <button
              onClick={() => setShareMethod('email')}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                shareMethod === 'email'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Mail className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">メール</span>
            </button>
            <button
              onClick={() => setShareMethod('team')}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                shareMethod === 'team'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mx-auto mb-1" />
              <span className="text-xs">チーム</span>
            </button>
          </div>

          {/* リンク共有 */}
          {shareMethod === 'link' && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                このリンクを共有すると、リンクを知っている人が名刺を閲覧できます
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant={copied ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      コピー
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* メール共有 */}
          {shareMethod === 'email' && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                メールアドレスを入力して共有リンクを送信
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-3 py-2 border rounded-lg mb-3"
              />
              <Button
                onClick={shareViaEmail}
                disabled={!email || loading}
                fullWidth
              >
                メールで送信
              </Button>
            </div>
          )}

          {/* チーム共有 */}
          {shareMethod === 'team' && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                チームメンバーを選択して共有
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {/* チームメンバーリスト（実際のデータはAPIから取得） */}
                {['山田太郎', '佐藤花子', '鈴木一郎'].map((member, index) => (
                  <label
                    key={index}
                    className="flex items-center p-2 hover:bg-gray-50 rounded"
                  >
                    <input
                      type="checkbox"
                      value={member}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTeamMembers([...teamMembers, member]);
                        } else {
                          setTeamMembers(teamMembers.filter(m => m !== member));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="text-sm">{member}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={shareWithTeam}
                disabled={teamMembers.length === 0 || loading}
                fullWidth
              >
                {teamMembers.length > 0
                  ? `${teamMembers.length}人と共有`
                  : 'メンバーを選択してください'}
              </Button>
            </div>
          )}
        </div>

        {/* 共有設定 */}
        <div className="px-4 py-3 bg-gray-50 border-t">
          <label className="flex items-center text-sm">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span>閲覧のみ許可（編集不可）</span>
          </label>
          <label className="flex items-center text-sm mt-2">
            <input type="checkbox" className="mr-2" />
            <span>7日後に自動的に共有を解除</span>
          </label>
        </div>
      </div>
    </div>
  );
};