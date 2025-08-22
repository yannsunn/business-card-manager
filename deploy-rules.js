const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// サービスアカウントキーのパスを確認
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service-account-key.json が見つかりません');
  console.log('📝 Firebase Console からサービスアカウントキーをダウンロードしてください:');
  console.log('https://console.firebase.google.com/project/crypto-talon-417715/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

// Firebase Admin SDK を初期化
const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'crypto-talon-417715'
});

async function deployRules() {
  try {
    console.log('🚀 Firestore ルールをデプロイ中...');
    
    // Firestore ルールを読み込み
    const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');
    
    // Firebase Admin SDK では直接ルールをデプロイできないため、
    // Firebase REST API を使用する必要があります
    console.log('✅ Firestore ルールファイルが確認されました');
    console.log('\n📝 以下のルールを Firebase Console で手動設定してください:');
    console.log('https://console.firebase.google.com/project/crypto-talon-417715/firestore/rules');
    console.log('\n--- Firestore Rules ---');
    console.log(firestoreRules);
    
    // Storage ルールを読み込み
    const storageRules = fs.readFileSync('storage.rules', 'utf8');
    console.log('\n📝 Storage ルールも手動設定してください:');
    console.log('https://console.firebase.google.com/project/crypto-talon-417715/storage/rules');
    console.log('\n--- Storage Rules ---');
    console.log(storageRules);
    
    console.log('\n✅ ルールファイルの準備が完了しました');
    console.log('👆 上記のリンクから Firebase Console でルールを設定してください');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// Node.js用のパッケージが必要な場合のインストールコマンド
console.log('\n📦 必要なパッケージをインストールするには:');
console.log('npm install firebase-admin');

deployRules();