import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDKの初期化
if (!getApps().length) {
  try {
    // Vercelの環境変数から証明書を取得
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error('Firebase Admin環境変数が設定されていません');
    } else {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase Admin SDK初期化成功');
    }
  } catch (error) {
    console.error('Firebase Admin SDK初期化エラー:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // URLパラメータからユーザーIDを取得
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ユーザーIDが必要です',
        usage: '/api/test-firestore?userId=YOUR_USER_ID'
      }, { status: 400 });
    }

    // Firestore接続テスト
    const db = getFirestore();
    
    // テストドキュメントを作成
    const testDoc = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Firestore接続テスト'
    };
    
    // ユーザーのcardsコレクションにテストドキュメントを追加
    const docRef = await db.collection('users').doc(userId).collection('cards').add(testDoc);
    
    // 作成したドキュメントを読み取り
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('ドキュメントの作成に失敗しました');
    }
    
    // テストドキュメントを削除
    await docRef.delete();
    
    return NextResponse.json({
      success: true,
      message: 'Firestore接続テスト成功',
      testData: doc.data(),
      documentId: doc.id,
      userId: userId,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
    
  } catch (error) {
    console.error('Firestoreテストエラー:', error);
    const err = error as any;
    return NextResponse.json({
      success: false,
      error: err?.message || 'Firestore接続テストに失敗しました',
      code: err?.code,
      details: err?.details || null
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, data } = await request.json();
    
    if (!userId || !data) {
      return NextResponse.json({ 
        error: 'ユーザーIDとデータが必要です'
      }, { status: 400 });
    }

    const db = getFirestore();
    
    // ユーザーのcardsコレクションにドキュメントを追加
    const docData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('users').doc(userId).collection('cards').add(docData);
    
    return NextResponse.json({
      success: true,
      message: 'ドキュメント作成成功',
      documentId: docRef.id,
      path: docRef.path
    });
    
  } catch (error) {
    console.error('Firestore書き込みエラー:', error);
    const err = error as any;
    return NextResponse.json({
      success: false,
      error: err?.message || 'Firestore書き込みに失敗しました',
      code: err?.code
    }, { status: 500 });
  }
}