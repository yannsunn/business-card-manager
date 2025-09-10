'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BusinessCard } from '@/types';
import { EmailRecipient, EmailTemplate, EmailSettings } from '@/types/email';
import { FiMail, FiCheck, FiX, FiSend, FiSettings, FiEdit, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    senderName: '',
    senderEmail: '',
    companyName: '',
    companyTitle: '',
    signature: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    body: ''
  });
  const [sending, setSending] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    loadCards();
    loadTemplates();
    loadEmailSettings();
  }, [user, router]);

  const loadCards = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'businessCards'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BusinessCard));
      
      setCards(cardsData);
      
      // メールアドレスがある名刺のみをレシピエントとして設定
      const recipientsData: EmailRecipient[] = cardsData
        .filter(card => card.emails && card.emails.length > 0 && card.id)
        .map(card => ({
          cardId: card.id!,
          email: card.emails?.[0] || '',
          name: card.name,
          company: card.companyName || '',
          selected: false
        }));
      
      setRecipients(recipientsData);
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const loadTemplates = async () => {
    if (!user) return;
    
    // デフォルトテンプレート
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'default-thank-you',
        name: 'お礼メール（標準）',
        subject: '【{{senderCompany}}】{{recipientName}}様 - お名刺交換のお礼',
        body: `{{recipientName}} 様

お世話になっております。
{{senderCompany}}の{{senderName}}です。

先日はお忙しい中、貴重なお時間をいただき誠にありがとうございました。
お名刺を交換させていただき、大変光栄に存じます。

{{recipientCompany}}様の益々のご発展を心よりお祈り申し上げます。
今後ともどうぞよろしくお願いいたします。

{{signature}}`,
        variables: ['recipientName', 'recipientCompany', 'senderName', 'senderCompany', 'signature'],
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    setTemplates(defaultTemplates);
    setSelectedTemplate(defaultTemplates[0].id);
  };

  const loadEmailSettings = async () => {
    if (!user) return;
    
    // ローカルストレージから設定を読み込み
    const saved = localStorage.getItem(`emailSettings_${user.uid}`);
    if (saved) {
      setEmailSettings(JSON.parse(saved));
    }
  };

  const saveEmailSettings = () => {
    if (!user) return;
    
    localStorage.setItem(`emailSettings_${user.uid}`, JSON.stringify(emailSettings));
    setShowSettings(false);
  };

  const toggleRecipient = (cardId: string) => {
    setRecipients(prev => 
      prev.map(r => r.cardId === cardId ? { ...r, selected: !r.selected } : r)
    );
  };

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setRecipients(prev => 
      prev.map(r => ({ ...r, selected: newSelectAll }))
    );
  };

  const filterByDate = () => {
    if (!filterDate) return;
    
    const selectedDate = new Date(filterDate);
    const filteredCards = cards.filter(card => {
      if (!card.createdAt) return false;
      
      // createdAt が Timestamp オブジェクトか文字列かを判定
      let cardDate: Date;
      if (typeof card.createdAt === 'string') {
        cardDate = new Date(card.createdAt);
      } else if (card.createdAt && typeof card.createdAt === 'object' && 'seconds' in card.createdAt) {
        cardDate = new Date((card.createdAt as any).seconds * 1000);
      } else {
        return false;
      }
      
      return (
        cardDate.getFullYear() === selectedDate.getFullYear() &&
        cardDate.getMonth() === selectedDate.getMonth() &&
        cardDate.getDate() === selectedDate.getDate()
      );
    });
    
    const filteredRecipients = filteredCards
      .filter(card => card.emails && card.emails.length > 0 && card.id)
      .map(card => ({
        cardId: card.id!,
        email: card.emails?.[0] || '',
        name: card.name,
        company: card.companyName || '',
        selected: true
      }));
    
    setRecipients(filteredRecipients);
    setSelectAll(true);
  };

  const prepareEmailContent = (recipient: EmailRecipient): { subject: string; body: string } => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return { subject: '', body: '' };
    
    let subject = template.subject;
    let body = template.body;
    
    // 変数を置換
    const replacements = {
      recipientName: recipient.name,
      recipientCompany: recipient.company,
      senderName: emailSettings.senderName,
      senderCompany: emailSettings.companyName,
      senderTitle: emailSettings.companyTitle,
      signature: emailSettings.signature || `${emailSettings.companyName}\n${emailSettings.senderName}`
    };
    
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value || '');
      body = body.replace(regex, value || '');
    });
    
    return { subject, body };
  };

  const sendEmails = async () => {
    const selectedRecipients = recipients.filter(r => r.selected);
    if (selectedRecipients.length === 0) {
      alert('送信先を選択してください');
      return;
    }
    
    if (!emailSettings.senderEmail || !emailSettings.senderName || !emailSettings.companyName) {
      alert('送信者情報を設定してください');
      setShowSettings(true);
      return;
    }
    
    setSending(true);
    
    try {
      // メール送信APIを呼び出し
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: selectedRecipients.map(r => ({
            ...r,
            ...prepareEmailContent(r)
          })),
          sender: {
            email: emailSettings.senderEmail,
            name: emailSettings.senderName
          }
        })
      });
      
      if (response.ok) {
        alert('メールを送信しました');
        // 送信済みのレシピエントをクリア
        setRecipients(prev => 
          prev.map(r => ({ ...r, selected: false, status: r.selected ? 'sent' : r.status }))
        );
        setSelectAll(false);
      } else {
        alert('メール送信に失敗しました');
      }
    } catch (error) {
      console.error('Failed to send emails:', error);
      alert('メール送信中にエラーが発生しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-white flex items-center">
          <FiMail className="mr-2" />
          お礼メール送信
        </h1>

        {/* 戻るボタンと設定・テンプレート */}
        <div className="mb-6 flex justify-between">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center"
          >
            <ArrowLeft className="mr-2" size={18} />
            ダッシュボードに戻る
          </Link>
          <div className="flex gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center"
            >
              <FiSettings className="mr-2" />
              送信者設定
              </button>
            
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg"
            >
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 送信者設定フォーム */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-white">送信者情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="会社名"
                value={emailSettings.companyName}
                onChange={(e) => setEmailSettings({...emailSettings, companyName: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              />
              <input
                type="text"
                placeholder="部署・役職"
                value={emailSettings.companyTitle}
                onChange={(e) => setEmailSettings({...emailSettings, companyTitle: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              />
              <input
                type="text"
                placeholder="送信者名"
                value={emailSettings.senderName}
                onChange={(e) => setEmailSettings({...emailSettings, senderName: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              />
              <input
                type="email"
                placeholder="送信元メールアドレス"
                value={emailSettings.senderEmail}
                onChange={(e) => setEmailSettings({...emailSettings, senderEmail: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              />
              <textarea
                placeholder="署名"
                value={emailSettings.signature}
                onChange={(e) => setEmailSettings({...emailSettings, signature: e.target.value})}
                className="col-span-2 px-4 py-2 bg-gray-700 text-white rounded-lg h-24"
              />
            </div>
            <button
              onClick={saveEmailSettings}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        )}

        {/* 日付フィルター */}
        <div className="mb-6 flex gap-4">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg"
          />
          <button
            onClick={filterByDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            この日に交換した名刺を選択
          </button>
        </div>

        {/* 一括選択 */}
        <div className="mb-4">
          <button
            onClick={toggleSelectAll}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center"
          >
            {selectAll ? <FiCheckSquare className="mr-2" /> : <FiSquare className="mr-2" />}
            すべて選択
          </button>
        </div>

        {/* レシピエントリスト */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-white">送信先一覧</h2>
          <div className="space-y-2">
            {recipients.length === 0 ? (
              <p className="text-gray-400">メールアドレスが登録されている名刺がありません</p>
            ) : (
              recipients.map(recipient => (
                <div
                  key={recipient.cardId}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer ${
                    recipient.selected ? 'bg-blue-900' : 'bg-gray-800'
                  } hover:bg-gray-700`}
                  onClick={() => toggleRecipient(recipient.cardId)}
                >
                  <div className="flex items-center">
                    {recipient.selected ? (
                      <FiCheckSquare className="mr-3 text-blue-400" />
                    ) : (
                      <FiSquare className="mr-3 text-gray-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">{recipient.name}</p>
                      <p className="text-sm text-gray-400">{recipient.company}</p>
                      <p className="text-sm text-gray-500">{recipient.email}</p>
                    </div>
                  </div>
                  {recipient.status === 'sent' && (
                    <span className="text-green-400 flex items-center">
                      <FiCheck className="mr-1" />
                      送信済み
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-center">
          <button
            onClick={sendEmails}
            disabled={sending || recipients.filter(r => r.selected).length === 0}
            className={`px-6 py-3 rounded-lg flex items-center ${
              sending || recipients.filter(r => r.selected).length === 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white font-semibold`}
          >
            <FiSend className="mr-2" />
            {sending ? '送信中...' : `選択した${recipients.filter(r => r.selected).length}件に送信`}
          </button>
        </div>
      </div>
    </div>
  );
}