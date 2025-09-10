import { 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query,
  DocumentReference,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';
import { BusinessCardError, ErrorCode, fromFirebaseError, logError } from '@/lib/errors';
import { withRetry } from '@/lib/utils/retry';

/**
 * Firestoreの操作をエラーハンドリング付きで実行
 */

// ドキュメント取得（エラーハンドリング付き）
export const safeGetDoc = async <T = DocumentData>(
  docRef: DocumentReference<T>
): Promise<T | null> => {
  try {
    const docSnap = await withRetry(
      () => getDoc(docRef),
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          // ネットワークエラーや一時的なエラーの場合リトライ
          return error?.code === 'unavailable' || error?.code === 'network-request-failed';
        }
      }
    );
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docSnap.data();
  } catch (error: any) {
    const bcError = fromFirebaseError(error);
    logError(bcError, { 
      operation: 'getDoc', 
      path: docRef.path 
    });
    throw bcError;
  }
};

// ドキュメント作成/更新（エラーハンドリング付き）
export const safeSetDoc = async <T = DocumentData>(
  docRef: DocumentReference<T>,
  data: T,
  options?: { merge?: boolean }
): Promise<void> => {
  try {
    await withRetry(
      () => setDoc(docRef, data, options || {}),
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          return error?.code === 'unavailable' || error?.code === 'network-request-failed';
        }
      }
    );
  } catch (error: any) {
    const bcError = fromFirebaseError(error);
    logError(bcError, { 
      operation: 'setDoc', 
      path: docRef.path,
      dataSize: JSON.stringify(data).length 
    });
    
    // 権限エラーの場合は特別な処理
    if (bcError.code === ErrorCode.FIREBASE_PERMISSION_DENIED) {
      throw new BusinessCardError(
        'このデータを保存する権限がありません。ログインし直してください。',
        ErrorCode.FIREBASE_PERMISSION_DENIED,
        403
      );
    }
    
    throw bcError;
  }
};

// ドキュメント更新（エラーハンドリング付き）
export const safeUpdateDoc = async <T = DocumentData>(
  docRef: DocumentReference<T>,
  data: Partial<T>
): Promise<void> => {
  try {
    await withRetry(
      () => updateDoc(docRef, data as any),
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          return error?.code === 'unavailable' || error?.code === 'network-request-failed';
        }
      }
    );
  } catch (error: any) {
    const bcError = fromFirebaseError(error);
    logError(bcError, { 
      operation: 'updateDoc', 
      path: docRef.path 
    });
    
    if (error?.code === 'not-found') {
      throw new BusinessCardError(
        '更新対象のデータが見つかりません',
        ErrorCode.FIREBASE_DOCUMENT_NOT_FOUND,
        404
      );
    }
    
    throw bcError;
  }
};

// ドキュメント削除（エラーハンドリング付き）
export const safeDeleteDoc = async <T = DocumentData>(
  docRef: DocumentReference<T>
): Promise<void> => {
  try {
    await withRetry(
      () => deleteDoc(docRef),
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          return error?.code === 'unavailable' || error?.code === 'network-request-failed';
        }
      }
    );
  } catch (error: any) {
    const bcError = fromFirebaseError(error);
    logError(bcError, { 
      operation: 'deleteDoc', 
      path: docRef.path 
    });
    throw bcError;
  }
};

// コレクション取得（エラーハンドリング付き）
export const safeGetDocs = async <T = DocumentData>(
  collectionRef: CollectionReference<T> | ReturnType<typeof query>
): Promise<T[]> => {
  try {
    const querySnapshot = await withRetry(
      () => getDocs(collectionRef as any),
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          return error?.code === 'unavailable' || error?.code === 'network-request-failed';
        }
      }
    );
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data
      } as T;
    });
  } catch (error: any) {
    const bcError = fromFirebaseError(error);
    logError(bcError, { 
      operation: 'getDocs',
      path: (collectionRef as any).path || 'query'
    });
    
    // クォータ超過エラーの場合
    if (bcError.code === ErrorCode.FIREBASE_QUOTA_EXCEEDED) {
      throw new BusinessCardError(
        'データ取得の制限に達しました。しばらくしてから再度お試しください。',
        ErrorCode.FIREBASE_QUOTA_EXCEEDED,
        429
      );
    }
    
    throw bcError;
  }
};

// トランザクション実行（エラーハンドリング付き）
export const safeTransaction = async <T>(
  transactionFn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    onError?: (error: BusinessCardError) => void;
  }
): Promise<T> => {
  const { maxAttempts = 3, onError } = options || {};
  
  try {
    return await withRetry(
      transactionFn,
      {
        maxRetries: maxAttempts,
        initialDelay: 1000,
        backoffFactor: 2,
        shouldRetry: (error) => {
          // トランザクション競合の場合はリトライ
          return error?.code === 'aborted' || 
                 error?.code === 'unavailable' || 
                 error?.code === 'deadline-exceeded';
        }
      }
    );
  } catch (error: any) {
    const bcError = fromFirebaseError(error);
    logError(bcError, { operation: 'transaction' });
    
    if (onError) {
      onError(bcError);
    }
    
    throw bcError;
  }
};

// バッチ処理のヘルパー
export const safeBatchOperation = async <T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options?: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
    onError?: (error: BusinessCardError, item: T) => void;
  }
): Promise<{ succeeded: T[]; failed: Array<{ item: T; error: BusinessCardError }> }> => {
  const { batchSize = 10, onProgress, onError } = options || {};
  const succeeded: T[] = [];
  const failed: Array<{ item: T; error: BusinessCardError }> = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (item) => {
        try {
          await operation(item);
          succeeded.push(item);
        } catch (error: any) {
          const bcError = error instanceof BusinessCardError ? error : fromFirebaseError(error);
          failed.push({ item, error: bcError });
          
          if (onError) {
            onError(bcError, item);
          }
        }
      })
    );
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }
  
  return { succeeded, failed };
};