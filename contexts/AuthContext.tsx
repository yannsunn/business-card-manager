'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // リダイレクト結果のチェック
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Googleログイン成功（リダイレクト）:', result.user.email);
        }
      })
      .catch((error: AuthError) => {
        console.error('Googleログインエラー（リダイレクト）:', {
          code: error.code,
          message: error.message,
          customData: error.customData
        });
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    
    // 追加のスコープを設定
    provider.addScope('profile');
    provider.addScope('email');
    
    // 毎回アカウント選択を表示
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // デバッグ情報を出力
    console.log('Googleログイン開始...');
    console.log('現在のドメイン:', window.location.hostname);
    console.log('認証ドメイン:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    
    // モバイルデバイスの検出
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    try {
      if (isMobile || isIOS) {
        console.log('モバイルデバイス検出: リダイレクト方式を使用');
        await signInWithRedirect(auth, provider);
      } else {
        console.log('デスクトップ: ポップアップ方式を使用');
        const result = await signInWithPopup(auth, provider);
        console.log('Googleログイン成功:', result.user.email);
      }
    } catch (error: any) {
      console.error('Googleログインエラー:', {
        code: error.code,
        message: error.message,
        customData: error.customData,
        fullError: error
      });
      
      // エラーの種類に応じて処理を分岐
      if (error.code === 'auth/popup-blocked') {
        console.log('ポップアップがブロックされました。リダイレクト方式に切り替えます。');
        await signInWithRedirect(auth, provider);
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error(`
          ======================================
          Firebase承認済みドメインエラー
          ======================================
          現在のドメイン: ${window.location.hostname}
          
          解決方法:
          1. Firebase Console (https://console.firebase.google.com) にアクセス
          2. プロジェクト "crypto-talon-417715" を選択
          3. Authentication → Settings → Authorized domains
          4. 以下のドメインを追加:
             - ${window.location.hostname}
             - localhost (開発用)
             - *.vercel.app (Vercel用)
          ======================================
        `);
      }
      
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    signInWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};