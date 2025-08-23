'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function DebugPage() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');
  const [isTestingWrite, setIsTestingWrite] = useState(false);
  const [isTestingRead, setIsTestingRead] = useState(false);

  useEffect(() => {
    // 環境変数のチェック
    const envInfo = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ 設定済み' : '❌ 未設定',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ 設定済み' : '❌ 未設定',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ 未設定',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ 設定済み' : '❌ 未設定',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ 設定済み' : '❌ 未設定',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ 設定済み' : '❌ 未設定',
    };

    // 認証情報
    const authInfo = {
      isAuthenticated: !!user,
      userId: user?.uid || 'なし',
      email: user?.email || 'なし',
      displayName: user?.displayName || 'なし',
      provider: user?.providerData?.[0]?.providerId || 'なし',
    };

    // Firebase App情報
    const appInfo = {
      authDomain: auth.app.options.authDomain || '未設定',
      projectId: auth.app.options.projectId || '未設定',
    };

    setDebugInfo({
      env: envInfo,
      auth: authInfo,
      app: appInfo,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  const testFirestoreWrite = async () => {
    if (!user) {
      setTestResult('❌ ログインが必要です');
      return;
    }

    setIsTestingWrite(true);
    setTestResult('テスト中...');

    try {
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Firestoreテストデータ',
        userId: user.uid,
      };

      console.log('テストデータ:', testData);
      console.log('保存先パス:', `users/${user.uid}/debug`);

      const docRef = await addDoc(
        collection(db, 'users', user.uid, 'debug'),
        testData
      );

      console.log('保存成功:', docRef.id);
      setTestResult(`✅ 書き込み成功！\nDocument ID: ${docRef.id}\nPath: users/${user.uid}/debug/${docRef.id}`);
    } catch (error: any) {
      console.error('Firestore書き込みエラー:', error);
      setTestResult(`❌ 書き込み失敗\nエラー: ${error.message}\nコード: ${error.code}`);
    } finally {
      setIsTestingWrite(false);
    }
  };

  const testFirestoreRead = async () => {
    if (!user) {
      setTestResult('❌ ログインが必要です');
      return;
    }

    setIsTestingRead(true);
    setTestResult('読み取り中...');

    try {
      const querySnapshot = await getDocs(
        collection(db, 'users', user.uid, 'cards')
      );

      const count = querySnapshot.size;
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('読み取り成功:', docs);
      setTestResult(`✅ 読み取り成功！\n名刺数: ${count}件\nPath: users/${user.uid}/cards`);
    } catch (error: any) {
      console.error('Firestore読み取りエラー:', error);
      setTestResult(`❌ 読み取り失敗\nエラー: ${error.message}\nコード: ${error.code}`);
    } finally {
      setIsTestingRead(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">Firebase デバッグページ</h1>
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>

        {/* 環境変数 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">1. 環境変数</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>API Key: {debugInfo.env?.apiKey}</div>
            <div>Auth Domain: {debugInfo.env?.authDomain}</div>
            <div className="text-yellow-400">Project ID: {debugInfo.env?.projectId}</div>
            <div>Storage Bucket: {debugInfo.env?.storageBucket}</div>
            <div>Messaging Sender ID: {debugInfo.env?.messagingSenderId}</div>
            <div>App ID: {debugInfo.env?.appId}</div>
          </div>
        </div>

        {/* 認証状態 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">2. 認証状態</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className={debugInfo.auth?.isAuthenticated ? 'text-green-400' : 'text-red-400'}>
              認証状態: {debugInfo.auth?.isAuthenticated ? '✅ ログイン済み' : '❌ 未ログイン'}
            </div>
            <div>User ID: {debugInfo.auth?.userId}</div>
            <div>Email: {debugInfo.auth?.email}</div>
            <div>表示名: {debugInfo.auth?.displayName}</div>
            <div>プロバイダ: {debugInfo.auth?.provider}</div>
          </div>
        </div>

        {/* Firebase App */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">3. Firebase App設定</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Auth Domain: {debugInfo.app?.authDomain}</div>
            <div className="text-yellow-400">Project ID: {debugInfo.app?.projectId}</div>
          </div>
        </div>

        {/* Firestoreテスト */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">4. Firestoreテスト</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={testFirestoreWrite}
                disabled={!user || isTestingWrite}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingWrite ? 'テスト中...' : '書き込みテスト'}
              </button>
              
              <button
                onClick={testFirestoreRead}
                disabled={!user || isTestingRead}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingRead ? '読み取り中...' : '読み取りテスト'}
              </button>
            </div>

            {testResult && (
              <div className="bg-gray-700 rounded-lg p-4 mt-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* デバッグ情報 */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">5. その他の情報</h2>
          <div className="text-sm text-gray-400">
            <div>更新時刻: {debugInfo.timestamp}</div>
            <div className="mt-2">
              <p className="text-yellow-400">⚠️ Project IDが正しく設定されているか確認してください</p>
              <p className="mt-1">期待値: crypto-talon-417715</p>
              <p>現在値: {debugInfo.app?.projectId || '未設定'}</p>
            </div>
          </div>
        </div>

        {!user && (
          <div className="mt-6 p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
            <p className="text-yellow-300">
              ⚠️ Firestoreテストを実行するには、先にログインしてください。
            </p>
            <Link href="/auth" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
              ログインページへ →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}