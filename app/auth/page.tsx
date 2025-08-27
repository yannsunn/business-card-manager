'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      router.push('/dashboard');
    } catch (error) {
      const err = error as { code?: string };
      setError(getErrorMessage(err.code || 'unknown'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error: any) {
      
      // エラーメッセージの詳細化
      let errorMessage = 'Googleログインに失敗しました。';
      
      if (error?.code === 'auth/popup-closed-by-user') {
        errorMessage = 'ログインがキャンセルされました。';
      } else if (error?.code === 'auth/popup-blocked') {
        errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください。';
      } else if (error?.code === 'auth/unauthorized-domain') {
        errorMessage = `このドメイン(${window.location.hostname})は承認されていません。Firebase Consoleで承認済みドメインを追加してください。`;
      } else if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google認証が有効になっていません。Firebase Consoleで有効化してください。';
      } else if (error?.code === 'auth/invalid-api-key') {
        errorMessage = 'APIキーが無効です。Firebase設定を確認してください。';
      } else if (error?.message) {
        errorMessage += ` 詳細: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setShowResetPassword(false);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === 'auth/user-not-found') {
        setError('このメールアドレスは登録されていません');
      } else {
        setError('パスワードリセットメールの送信に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return '無効なメールアドレスです。';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'メールアドレスまたはパスワードが間違っています。';
      case 'auth/user-not-found':
        return 'このユーザーは存在しません。';
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上にしてください。';
      default:
        return '認証に失敗しました。';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-8">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          名刺管理システムへようこそ
        </h2>
        
        {error && (
          <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {resetEmailSent && (
          <div className="bg-green-900 border border-green-600 text-green-300 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm">パスワードリセットメールを送信しました</p>
          </div>
        )}

        {showResetPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">パスワードをリセットするメールアドレスを入力してください</p>
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="email"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <button
                onClick={handlePasswordReset}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 px-4 hover:bg-blue-700 transition-colors font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '送信中...' : 'リセットメールを送信'}
              </button>
              <button
                onClick={() => setShowResetPassword(false)}
                disabled={isLoading}
                className="flex-1 bg-gray-600 text-white rounded-lg py-3 px-4 hover:bg-gray-700 transition-colors font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="email"
            disabled={isLoading}
            required
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            disabled={isLoading}
            required
          />
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white rounded-lg py-3 px-4 hover:bg-blue-700 transition-colors font-medium text-base active:bg-blue-800 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </>
              ) : (
                isSignUp ? '新規登録' : 'ログイン'
              )}
            </button>
          </div>
          {!isSignUp && (
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="w-full text-blue-400 hover:text-blue-300 text-sm mt-2"
            >
              パスワードを忘れた方
            </button>
          )}
        </form>
        )}

        {!showResetPassword && (
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
            className="w-full mt-4 text-gray-400 hover:text-gray-300 text-sm py-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSignUp ? 'すでにアカウントをお持ちの方' : 'アカウントを新規作成'}
          </button>
        )}

        <div className="my-6 flex items-center">
          <hr className="flex-grow border-gray-600" />
          <span className="px-4 text-gray-500">または</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading || showResetPassword}
          className="w-full bg-white text-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors font-medium text-base active:bg-gray-300 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          <span>Googleでログイン</span>
        </button>
      </div>
    </div>
  );
}