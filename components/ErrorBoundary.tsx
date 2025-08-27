'use client';

import React, { Component, ReactNode } from 'react';
import { BusinessCardError, logError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | BusinessCardError | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // エラーログを記録
    logError(error, { errorId, source: 'ErrorBoundary' });
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // エラー追跡サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentry等への送信
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
    
    // ページをリロード
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const error = this.state.error;
      const isOperational = error instanceof BusinessCardError && error.isOperational;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-900 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {isOperational ? 'エラーが発生しました' : 'システムエラー'}
            </h1>
            
            <p className="text-gray-300 text-center mb-6">
              {isOperational 
                ? error.message 
                : '申し訳ございません。予期しないエラーが発生しました。'}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-300 text-sm">
                  詳細情報（開発環境のみ）
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 rounded text-xs text-gray-400 overflow-auto">
                  {JSON.stringify({
                    errorId: this.state.errorId,
                    name: error?.name,
                    message: error?.message,
                    code: (error as BusinessCardError)?.code,
                    stack: error?.stack
                  }, null, 2)}
                </pre>
              </details>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 px-4 hover:bg-blue-700 transition-colors font-medium"
              >
                ページを再読み込み
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-gray-700 text-white rounded-lg py-3 px-4 hover:bg-gray-600 transition-colors font-medium"
              >
                前のページに戻る
              </button>
            </div>

            {!isOperational && (
              <p className="text-center text-gray-500 text-xs mt-4">
                エラーID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}