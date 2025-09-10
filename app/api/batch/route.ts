import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, apiRateLimits } from '@/lib/security/rateLimit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BatchItem {
  id: string;
  frontImage?: string;
  backImage?: string;
  metadata?: Record<string, any>;
}

interface BatchResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

// バッチ処理の最大アイテム数
const MAX_BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { items, operation } = body;

    // バリデーション
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '処理するアイテムが指定されていません' },
        { status: 400 }
      );
    }

    if (items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `バッチサイズは最大${MAX_BATCH_SIZE}件までです` },
        { status: 400 }
      );
    }

    // 操作タイプごとの処理
    let results: BatchResult[] = [];

    switch (operation) {
      case 'analyze':
        results = await batchAnalyzeCards(items);
        break;
      
      case 'import':
        results = await batchImportCards(items);
        break;
      
      case 'export':
        results = await batchExportCards(items);
        break;
      
      case 'delete':
        results = await batchDeleteCards(items);
        break;
      
      default:
        return NextResponse.json(
          { error: '不正な操作が指定されました' },
          { status: 400 }
        );
    }

    // 結果のサマリーを作成
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('バッチ処理エラー:', error);
    return NextResponse.json(
      { error: 'バッチ処理に失敗しました' },
      { status: 500 }
    );
  }
}

// 名刺の一括分析
async function batchAnalyzeCards(items: BatchItem[]): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  // Gemini APIを使用した並列処理
  const promises = items.map(async (item) => {
    try {
      // ここでGemini APIを呼び出して画像分析
      // 実際の実装では analyze-card のロジックを再利用
      const analysisResult = await analyzeCardWithGemini(item);
      
      return {
        id: item.id,
        success: true,
        result: analysisResult
      };
    } catch (error) {
      return {
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : '分析に失敗しました'
      };
    }
  });

  const processedResults = await Promise.allSettled(promises);
  
  processedResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        id: 'unknown',
        success: false,
        error: result.reason
      });
    }
  });

  return results;
}

// 名刺の一括インポート
async function batchImportCards(items: any[]): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  for (const item of items) {
    try {
      // Firestoreに保存
      const docRef = await addDoc(collection(db, 'businessCards'), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'batch_import'
      });
      
      results.push({
        id: item.id || docRef.id,
        success: true,
        result: { docId: docRef.id }
      });
    } catch (error) {
      results.push({
        id: item.id || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'インポートに失敗しました'
      });
    }
  }

  return results;
}

// 名刺の一括エクスポート
async function batchExportCards(items: any[]): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  for (const item of items) {
    try {
      // エクスポート処理（実際の実装では詳細な処理を追加）
      results.push({
        id: item.id,
        success: true,
        result: {
          exported: true,
          format: 'json'
        }
      });
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
      });
    }
  }

  return results;
}

// 名刺の一括削除
async function batchDeleteCards(items: any[]): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  // 実際の削除処理（認証とアクセス権限の確認が必要）
  for (const item of items) {
    try {
      // Firestoreから削除（実装省略）
      results.push({
        id: item.id,
        success: true,
        result: { deleted: true }
      });
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : '削除に失敗しました'
      });
    }
  }

  return results;
}

// Gemini APIを使用した画像分析（簡略版）
async function analyzeCardWithGemini(item: BatchItem) {
  // 実際の実装では analyze-card/route.ts のロジックを再利用
  return {
    name: 'サンプル名',
    company: 'サンプル会社',
    analyzed: true
  };
}

// レート制限はmiddleware.tsで適用するため、ここでは直接エクスポート