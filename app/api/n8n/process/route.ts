import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface BusinessCardData {
  name?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  website?: string;
  department?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, imageUrl } = await request.json();

    if (!documentId || !imageUrl) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // Fetch image from URL
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageData = await imageBlob.arrayBuffer();
    const base64Image = Buffer.from(imageData).toString('base64');

    // Process with Gemini Vision
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
    この名刺画像から以下の情報を抽出してください。
    JSONフォーマットで返してください：
    {
      "name": "氏名",
      "company": "会社名",
      "title": "役職",
      "department": "部署",
      "email": "メールアドレス",
      "phone": "電話番号",
      "mobile": "携帯番号",
      "address": "住所",
      "website": "ウェブサイト"
    }
    
    存在しない項目はnullとしてください。
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    let extractedData: BusinessCardData = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('JSON解析エラー:', e);
      extractedData = { name: text };
    }

    // Update Firestore document
    const docRef = doc(db, 'scanned_cards', documentId);
    await updateDoc(docRef, {
      processed: true,
      processedAt: new Date(),
      ocrData: extractedData,
    });

    // Create business card entry
    const cardData = {
      name: extractedData.name || '',
      company: extractedData.company || '',
      title: extractedData.title || '',
      department: extractedData.department || '',
      email: extractedData.email || '',
      phone: extractedData.phone || '',
      mobile: extractedData.mobile || '',
      address: extractedData.address || '',
      website: extractedData.website || '',
      notes: '',
      imageUrl: imageUrl,
      createdAt: new Date(),
      source: 'scansnap_ocr',
    };

    const { addDoc, collection } = await import('firebase/firestore');
    const cardRef = await addDoc(collection(db, 'businessCards'), cardData);

    return NextResponse.json({
      success: true,
      cardId: cardRef.id,
      extractedData,
      message: 'OCR処理が完了しました',
    });
  } catch (error) {
    console.error('OCR処理エラー:', error);
    return NextResponse.json(
      { error: 'OCR処理に失敗しました' },
      { status: 500 }
    );
  }
}