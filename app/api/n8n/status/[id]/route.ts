import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'IDが指定されていません' },
        { status: 400 }
      );
    }

    // Get document from Firestore
    const docRef = doc(db, 'scanned_cards', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'ドキュメントが見つかりません' },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    return NextResponse.json({
      id: docSnap.id,
      ...data,
      status: data.processed ? 'completed' : 'pending',
    });
  } catch (error) {
    console.error('ステータス取得エラー:', error);
    return NextResponse.json(
      { error: 'ステータスの取得に失敗しました' },
      { status: 500 }
    );
  }
}