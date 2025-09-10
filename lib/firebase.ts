import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim()
};

// Firebase設定の検証
if (typeof window !== 'undefined') {
  // 必須設定の確認
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.error('Firebase設定が不完全です。.env.localファイルを確認してください。');
  }
}

// Firebase初期化
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  console.error('Firebase初期化エラー:', error);
  // デフォルト設定で初期化を試みる
  app = initializeApp({
    ...firebaseConfig,
    projectId: firebaseConfig.projectId || 'crypto-talon-417715'
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firestoreの接続状態を管理
if (typeof window !== 'undefined') {
  // オンライン/オフライン状態の監視
  window.addEventListener('online', async () => {
    console.log('ネットワーク接続が復旧しました');
    try {
      await enableNetwork(db);
      console.log('Firestoreへの接続を再開しました');
    } catch (error) {
      console.error('Firestore再接続エラー:', error);
    }
  });

  window.addEventListener('offline', async () => {
    console.log('ネットワーク接続が切断されました');
    try {
      await disableNetwork(db);
      console.log('Firestoreをオフラインモードに切り替えました');
    } catch (error) {
      console.error('Firestoreオフライン切替エラー:', error);
    }
  });
  
  // 初期接続テスト
  enableNetwork(db).then(() => {
    console.log('Firestoreに正常に接続しました');
  }).catch((error) => {
    console.error('Firestore接続エラー:', error);
    console.error('エラー詳細:', {
      code: error.code,
      message: error.message,
      projectId: firebaseConfig.projectId
    });
  });
}

// エミュレータの設定（開発環境のみ）
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  if (typeof window !== 'undefined') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
    } catch {
      // 既に接続されている場合はエラーを無視
    }
  }
}