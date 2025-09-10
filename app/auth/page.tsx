'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAnnounce } from '@/hooks/useAccessibility';
import { Button } from '@/components/Button';

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
  const { announce } = useAnnounce();

  // Focus management
  useEffect(() => {
    const firstInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    firstInput?.focus();
  }, [showResetPassword]);

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
      announce('ログイン成功しました', 'assertive');
      router.push('/dashboard');
    } catch (error) {
      const err = error as { code?: string };
      const errorMessage = getErrorMessage(err.code || 'unknown');
      setError(errorMessage);
      announce(errorMessage, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithGoogle();
      announce('Googleログイン成功しました', 'assertive');
      router.push('/dashboard');
    } catch (error: any) {
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
      announce(errorMessage, 'assertive');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      const message = 'メールアドレスを入力してください';
      setError(message);
      announce(message, 'assertive');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setShowResetPassword(false);
      announce('パスワードリセットメールを送信しました', 'assertive');
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error) {
      const err = error as { code?: string };
      let errorMessage = 'パスワードリセットメールの送信に失敗しました';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'このメールアドレスは登録されていません';
      }
      setError(errorMessage);
      announce(errorMessage, 'assertive');
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
      <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md" role="main">
        <h1 className="text-2xl font-bold text-center text-white mb-6" id="auth-title">
          名刺管理システムへようこそ
        </h1>
        
        {error && (
          <div 
            className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded-lg mb-4" 
            role="alert" 
            aria-live="assertive"
            id="error-message"
          >
            <p className="text-sm">{error}</p>
          </div>
        )}

        {resetEmailSent && (
          <div 
            className="bg-green-900 border border-green-600 text-green-300 px-4 py-3 rounded-lg mb-4" 
            role="status" 
            aria-live="polite"
          >
            <p className="text-sm">パスワードリセットメールを送信しました</p>
          </div>
        )}

        {showResetPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">パスワードをリセットするメールアドレスを入力してください</p>
            <div>
              <label htmlFor="reset-email" className="sr-only">メールアドレス</label>
              <input
                id="reset-email"
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="email"
                disabled={isLoading}
                required
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'error-message' : undefined}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePasswordReset}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '送信中...' : 'リセットメールを送信'}
              </Button>
              <Button
                onClick={() => setShowResetPassword(false)}
                disabled={isLoading}
                variant="secondary"
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="auth-title">
          <div>
            <label htmlFor="auth-email" className="sr-only">メールアドレス</label>
            <input
              id="auth-email"
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              autoComplete="email"
              disabled={isLoading}
              required
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'error-message' : undefined}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="sr-only">パスワード</label>
            <input
              id="auth-password"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={isLoading}
              required
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'error-message' : undefined}
            />
          </div>
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '処理中...' : (isSignUp ? '新規登録' : 'ログイン')}
            </Button>
          </div>
          {!isSignUp && (
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="w-full text-blue-400 hover:text-blue-300 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              aria-label="パスワードをリセット"
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
            className="w-full mt-4 text-gray-400 hover:text-gray-300 text-sm py-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
            aria-label={isSignUp ? 'ログインフォームに切り替え' : '新規登録フォームに切り替え'}
          >
            {isSignUp ? 'すでにアカウントをお持ちの方' : 'アカウントを新規作成'}
          </button>
        )}

        <div className="my-6 flex items-center" role="separator">
          <hr className="flex-grow border-gray-600" aria-hidden="true" />
          <span className="px-4 text-gray-500">または</span>
          <hr className="flex-grow border-gray-600" aria-hidden="true" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading || showResetPassword}
          className="w-full bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 px-6 py-3 text-lg rounded-lg flex items-center justify-center gap-2.5 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Googleアカウントでログイン"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
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