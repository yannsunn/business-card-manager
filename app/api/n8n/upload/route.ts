import { NextRequest, NextResponse } from 'next/server';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // Parse metadata if provided
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        console.error('メタデータのパースエラー:', e);
      }
    }

    // Upload to Firebase Storage
    const timestamp = Date.now();
    const fileName = `business-cards/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await uploadBytes(storageRef, buffer, {
      contentType: file.type,
    });
    
    const downloadURL = await getDownloadURL(storageRef);

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'scanned_cards'), {
      fileName: file.name,
      fileUrl: downloadURL,
      uploadedAt: serverTimestamp(),
      source: 'scansnap',
      processed: false,
      metadata: parsedMetadata,
      ocrData: null,
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      url: downloadURL,
      message: '名刺がアップロードされました',
    });
  } catch (error) {
    console.error('アップロードエラー:', error);
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'n8n連携APIエンドポイント',
    endpoints: {
      upload: 'POST /api/n8n/upload',
      process: 'POST /api/n8n/process',
      status: 'GET /api/n8n/status/:id',
    }
  });
}