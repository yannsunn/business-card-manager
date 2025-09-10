'use client';

import { useState, useCallback } from 'react';
import { BusinessCardError, isBusinessCardError, logError, ErrorCode } from '@/lib/errors';
import { useRouter } from 'next/navigation';

interface ErrorState {
  error: BusinessCardError | null;
  isLoading: boolean;
  retry: () => void;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    retry: () => {}
  });
  const router = useRouter();

  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    // ビジネスカードエラーでない場合は変換
    const bcError = isBusinessCardError(error) ? error : new BusinessCardError(
      error?.message || '予期しないエラーが発生しました',
      ErrorCode.UNKNOWN_ERROR,
      500,
      true,
      context
    );

    // エラーログを記録
    logError(bcError, context);

    // 特定のエラーコードに対する処理
    switch (bcError.code) {
      case ErrorCode.AUTH_SESSION_EXPIRED:
      case ErrorCode.AUTH_UNAUTHORIZED:
        // 認証ページにリダイレクト
        router.push('/auth');
        break;
      
      case ErrorCode.FIREBASE_QUOTA_EXCEEDED:
      case ErrorCode.API_RATE_LIMIT:
        // レート制限エラーの場合は一定時間後にリトライ可能にする
        setTimeout(() => {
          setErrorState(prev => ({ ...prev, error: null }));
        }, 60000); // 1分後にリセット
        break;
    }

    setErrorState({
      error: bcError,
      isLoading: false,
      retry: () => setErrorState(prev => ({ ...prev, error: null }))
    });

    return bcError;
  }, [router]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      retry: () => {}
    });
  }, []);

  const withErrorHandling = useCallback(async <T,>(
    asyncFunction: () => Promise<T>,
    options?: {
      context?: Record<string, any>;
      onError?: (error: BusinessCardError) => void;
      showErrorUI?: boolean;
    }
  ): Promise<T | null> => {
    const { context, onError, showErrorUI = true } = options || {};
    
    setErrorState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await asyncFunction();
      setErrorState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      const bcError = handleError(error, context);
      
      if (onError) {
        onError(bcError);
      }
      
      if (!showErrorUI) {
        clearError();
      }
      
      return null;
    }
  }, [handleError, clearError]);

  return {
    error: errorState.error,
    isLoading: errorState.isLoading,
    retry: errorState.retry,
    handleError,
    clearError,
    withErrorHandling
  };
};