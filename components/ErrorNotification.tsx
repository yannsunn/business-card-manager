'use client';

import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BusinessCardError, ErrorCode } from '@/lib/errors';

interface ErrorNotificationProps {
  error: BusinessCardError | Error | null;
  onClose?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onClose,
  autoHide = true,
  autoHideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);

      if (autoHide && error instanceof BusinessCardError && error.isOperational) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          if (onClose) {
            setTimeout(onClose, 300); // アニメーション後にonClose実行
          }
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoHide, autoHideDelay, onClose]);

  if (!error || !isVisible) return null;

  const isBusinessCardError = error instanceof BusinessCardError;
  const isWarning = isBusinessCardError && [
    ErrorCode.API_RATE_LIMIT,
    ErrorCode.FIREBASE_QUOTA_EXCEEDED,
    ErrorCode.CARD_LIMIT_EXCEEDED
  ].includes(error.code);

  const bgColor = isWarning ? 'bg-yellow-900' : 'bg-red-900';
  const borderColor = isWarning ? 'border-yellow-600' : 'border-red-600';
  const textColor = isWarning ? 'text-yellow-300' : 'text-red-300';
  const iconColor = isWarning ? 'text-yellow-400' : 'text-red-400';

  // エラーに応じたアクション提案
  const getActionSuggestion = () => {
    if (!isBusinessCardError) return null;

    switch (error.code) {
      case ErrorCode.AUTH_SESSION_EXPIRED:
      case ErrorCode.AUTH_UNAUTHORIZED:
        return (
          <button
            onClick={() => window.location.href = '/auth'}
            className="mt-2 text-sm underline hover:no-underline"
          >
            ログインページへ移動
          </button>
        );
      
      case ErrorCode.API_NETWORK_ERROR:
      case ErrorCode.FIREBASE_CONNECTION_FAILED:
        return (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            ページを再読み込み
          </button>
        );
      
      case ErrorCode.IMAGE_SIZE_TOO_LARGE:
        return (
          <p className="mt-2 text-sm">
            画像を圧縮するか、小さいサイズの画像をお使いください
          </p>
        );
      
      default:
        return null;
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`${bgColor} ${borderColor} border rounded-lg shadow-lg p-4`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {isWarning ? (
              <svg className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            ) : (
              <svg className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            )}
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${textColor}`}>
              {isWarning ? '警告' : 'エラー'}
            </h3>
            <div className={`mt-2 text-sm ${textColor}`}>
              <p>{error.message}</p>
              {getActionSuggestion()}
            </div>
            
            {process.env.NODE_ENV === 'development' && isBusinessCardError && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs opacity-60 hover:opacity-100">
                  詳細情報（開発環境）
                </summary>
                <pre className="mt-1 text-xs opacity-80 overflow-x-auto">
                  Code: {error.code}
                  Status: {error.statusCode}
                  {error.context && `\nContext: ${JSON.stringify(error.context, null, 2)}`}
                </pre>
              </details>
            )}
          </div>

          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setIsVisible(false);
                if (onClose) {
                  setTimeout(onClose, 300);
                }
              }}
              className={`inline-flex ${textColor} hover:opacity-75 focus:outline-none`}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" 
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// グローバルエラー通知のためのコンテキスト
import { createContext, useContext, useCallback } from 'react';

interface ErrorNotificationContextType {
  showError: (error: BusinessCardError | Error | string) => void;
  clearError: () => void;
}

const ErrorNotificationContext = createContext<ErrorNotificationContextType | undefined>(undefined);

export const useErrorNotification = () => {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within ErrorNotificationProvider');
  }
  return context;
};

export const ErrorNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<BusinessCardError | Error | null>(null);

  const showError = useCallback((error: BusinessCardError | Error | string) => {
    if (typeof error === 'string') {
      setError(new Error(error));
    } else {
      setError(error);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ErrorNotificationContext.Provider value={{ showError, clearError }}>
      <ErrorBoundary onError={showError}>
        {children}
        <ErrorNotification error={error} onClose={clearError} />
      </ErrorBoundary>
    </ErrorNotificationContext.Provider>
  );
};

/**
 * Error Boundary Component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error | BusinessCardError) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Convert to BusinessCardError if needed
    const businessError = error instanceof BusinessCardError 
      ? error 
      : new BusinessCardError(
          error.message,
          ErrorCode.UNKNOWN_ERROR,
          500,
          false,
          { componentStack: errorInfo.componentStack }
        );
    
    // Call the error handler
    if (this.props.onError) {
      this.props.onError(businessError);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-400 mb-4">エラーが発生しました</h2>
            <p className="text-gray-300 mb-4">
              申し訳ございません。予期しないエラーが発生しました。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}