/**
 * エラーハンドリングユーティリティ
 * すべてのエラーを統一的に処理するための中央管理システム
 */

// エラーコードの定義
export enum ErrorCode {
  // 認証関連
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',
  
  // Firebase関連
  FIREBASE_CONNECTION_FAILED = 'FIREBASE_CONNECTION_FAILED',
  FIREBASE_PERMISSION_DENIED = 'FIREBASE_PERMISSION_DENIED',
  FIREBASE_QUOTA_EXCEEDED = 'FIREBASE_QUOTA_EXCEEDED',
  FIREBASE_DOCUMENT_NOT_FOUND = 'FIREBASE_DOCUMENT_NOT_FOUND',
  
  // API関連
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_INVALID_REQUEST = 'API_INVALID_REQUEST',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  
  // 画像処理関連
  IMAGE_INVALID_FORMAT = 'IMAGE_INVALID_FORMAT',
  IMAGE_SIZE_TOO_LARGE = 'IMAGE_SIZE_TOO_LARGE',
  IMAGE_PROCESSING_FAILED = 'IMAGE_PROCESSING_FAILED',
  
  // ビジネスロジック
  CARD_DUPLICATE = 'CARD_DUPLICATE',
  CARD_INVALID_DATA = 'CARD_INVALID_DATA',
  CARD_LIMIT_EXCEEDED = 'CARD_LIMIT_EXCEEDED',
  
  // その他
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// カスタムエラークラス
export class BusinessCardError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessCardError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // スタックトレースを保持
    Error.captureStackTrace(this, this.constructor);
  }
}

// エラーメッセージマッピング
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'メールアドレスまたはパスワードが正しくありません',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'セッションが期限切れです。再度ログインしてください',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'この操作を実行する権限がありません',
  [ErrorCode.AUTH_EMAIL_ALREADY_EXISTS]: 'このメールアドレスは既に登録されています',
  
  [ErrorCode.FIREBASE_CONNECTION_FAILED]: 'サーバーへの接続に失敗しました。インターネット接続を確認してください',
  [ErrorCode.FIREBASE_PERMISSION_DENIED]: 'アクセス権限がありません',
  [ErrorCode.FIREBASE_QUOTA_EXCEEDED]: '利用制限に達しました。しばらくしてから再度お試しください',
  [ErrorCode.FIREBASE_DOCUMENT_NOT_FOUND]: '指定されたデータが見つかりません',
  
  [ErrorCode.API_NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [ErrorCode.API_TIMEOUT]: 'リクエストがタイムアウトしました',
  [ErrorCode.API_INVALID_REQUEST]: '無効なリクエストです',
  [ErrorCode.API_RATE_LIMIT]: 'リクエスト数が制限を超えました。しばらくお待ちください',
  [ErrorCode.API_SERVER_ERROR]: 'サーバーエラーが発生しました',
  
  [ErrorCode.IMAGE_INVALID_FORMAT]: '対応していない画像形式です（JPG、PNG、WEBPのみ対応）',
  [ErrorCode.IMAGE_SIZE_TOO_LARGE]: '画像サイズが大きすぎます（最大10MBまで）',
  [ErrorCode.IMAGE_PROCESSING_FAILED]: '画像の処理に失敗しました',
  
  [ErrorCode.CARD_DUPLICATE]: 'この名刺は既に登録されています',
  [ErrorCode.CARD_INVALID_DATA]: '名刺情報が不正です',
  [ErrorCode.CARD_LIMIT_EXCEEDED]: '名刺の登録上限に達しました',
  
  [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました',
  [ErrorCode.VALIDATION_ERROR]: '入力内容に誤りがあります'
};

// エラー判定ヘルパー
export const isBusinessCardError = (error: any): error is BusinessCardError => {
  return error instanceof BusinessCardError;
};

// Firebaseエラーをカスタムエラーに変換
export const fromFirebaseError = (error: any): BusinessCardError => {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';
  
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
    case 'auth/invalid-credential':
      return new BusinessCardError(
        ErrorMessages[ErrorCode.AUTH_INVALID_CREDENTIALS],
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        401
      );
    
    case 'auth/email-already-in-use':
      return new BusinessCardError(
        ErrorMessages[ErrorCode.AUTH_EMAIL_ALREADY_EXISTS],
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
        409
      );
    
    case 'permission-denied':
      return new BusinessCardError(
        ErrorMessages[ErrorCode.FIREBASE_PERMISSION_DENIED],
        ErrorCode.FIREBASE_PERMISSION_DENIED,
        403
      );
    
    case 'not-found':
      return new BusinessCardError(
        ErrorMessages[ErrorCode.FIREBASE_DOCUMENT_NOT_FOUND],
        ErrorCode.FIREBASE_DOCUMENT_NOT_FOUND,
        404
      );
    
    case 'resource-exhausted':
      return new BusinessCardError(
        ErrorMessages[ErrorCode.FIREBASE_QUOTA_EXCEEDED],
        ErrorCode.FIREBASE_QUOTA_EXCEEDED,
        429
      );
    
    case 'unavailable':
      return new BusinessCardError(
        ErrorMessages[ErrorCode.FIREBASE_CONNECTION_FAILED],
        ErrorCode.FIREBASE_CONNECTION_FAILED,
        503
      );
    
    default:
      return new BusinessCardError(
        errorMessage || ErrorMessages[ErrorCode.UNKNOWN_ERROR],
        ErrorCode.UNKNOWN_ERROR,
        500,
        true,
        { originalError: errorCode }
      );
  }
};

// APIエラーをカスタムエラーに変換
export const fromAPIError = (error: any): BusinessCardError => {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return new BusinessCardError(
      ErrorMessages[ErrorCode.API_TIMEOUT],
      ErrorCode.API_TIMEOUT,
      408
    );
  }
  
  if (error.name === 'NetworkError' || !navigator.onLine) {
    return new BusinessCardError(
      ErrorMessages[ErrorCode.API_NETWORK_ERROR],
      ErrorCode.API_NETWORK_ERROR,
      0
    );
  }
  
  const status = error?.response?.status || error?.status;
  
  switch (status) {
    case 400:
      return new BusinessCardError(
        ErrorMessages[ErrorCode.API_INVALID_REQUEST],
        ErrorCode.API_INVALID_REQUEST,
        400
      );
    
    case 429:
      return new BusinessCardError(
        ErrorMessages[ErrorCode.API_RATE_LIMIT],
        ErrorCode.API_RATE_LIMIT,
        429
      );
    
    case 500:
    case 502:
    case 503:
      return new BusinessCardError(
        ErrorMessages[ErrorCode.API_SERVER_ERROR],
        ErrorCode.API_SERVER_ERROR,
        status
      );
    
    default:
      return new BusinessCardError(
        error?.message || ErrorMessages[ErrorCode.UNKNOWN_ERROR],
        ErrorCode.UNKNOWN_ERROR,
        status || 500
      );
  }
};

// エラーロギング
export const logError = (error: BusinessCardError | Error, additionalContext?: Record<string, any>) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...(isBusinessCardError(error) ? {
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context
    } : {}),
    ...additionalContext
  };
  
  // 開発環境では詳細をコンソールに出力
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Error logged:', errorInfo);
  }
  
  // 本番環境では外部エラー追跡サービスに送信
  // TODO: Sentry, LogRocket等の実装
  
  return errorInfo;
};

// リトライロジック
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = (error) => {
      if (isBusinessCardError(error)) {
        return [
          ErrorCode.API_NETWORK_ERROR,
          ErrorCode.API_TIMEOUT,
          ErrorCode.FIREBASE_CONNECTION_FAILED
        ].includes(error.code);
      }
      return false;
    }
  } = options;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      console.log(`リトライ ${attempt}/${maxAttempts} - ${waitTime}ms後に再試行`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};