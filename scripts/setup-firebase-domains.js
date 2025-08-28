#!/usr/bin/env node

/**
 * Firebase承認済みドメインを自動設定するスクリプト
 * 
 * 使用方法:
 * 1. Firebase Console から Service Account キーをダウンロード
 * 2. GOOGLE_APPLICATION_CREDENTIALS 環境変数にパスを設定
 * 3. node scripts/setup-firebase-domains.js を実行
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// 承認済みドメインのリスト
const AUTHORIZED_DOMAINS = [
  'localhost',
  'business-card-manager.vercel.app',
  'business-card-manager-yasuus-projects.vercel.app',
  // Vercelの動的URLパターン
  'business-card-manager-9uhql0ipz-yasuus-projects.vercel.app',
  'business-card-manager-6pg9rrf0d-yasuus-projects.vercel.app',
  'business-card-manager-9ksaluzm2-yasuus-projects.vercel.app',
];

async function setupAuthorizedDomains() {
  try {
    console.log('Firebase承認済みドメインの設定を開始します...\n');
    
    // Service Account認証が必要
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error('エラー: GOOGLE_APPLICATION_CREDENTIALS環境変数が設定されていません');
      console.log('\n設定方法:');
      console.log('1. Firebase Console → Project Settings → Service Accounts');
      console.log('2. "Generate new private key" をクリック');
      console.log('3. ダウンロードしたJSONファイルのパスを環境変数に設定:');
      console.log('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"');
      console.log('4. このスクリプトを再実行');
      process.exit(1);
    }

    // Firebase Admin SDK初期化
    const app = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      projectId: 'crypto-talon-417715'
    });

    const auth = getAuth(app);

    // 現在の設定を取得
    console.log('現在の承認済みドメインを取得中...');
    const config = await auth.projectConfigManager().getProjectConfig();
    const currentDomains = config.authorizedDomains || [];
    
    console.log('現在の承認済みドメイン:');
    currentDomains.forEach(domain => console.log(`  - ${domain}`));
    console.log();

    // 新しいドメインを追加
    const newDomains = [...new Set([...currentDomains, ...AUTHORIZED_DOMAINS])];
    
    if (newDomains.length === currentDomains.length) {
      console.log('すべてのドメインは既に承認済みです。');
      return;
    }

    console.log('新しいドメインを追加中...');
    await auth.projectConfigManager().updateProjectConfig({
      authorizedDomains: newDomains
    });

    console.log('\n✅ 承認済みドメインの設定が完了しました！');
    console.log('\n追加されたドメイン:');
    newDomains.forEach(domain => {
      if (!currentDomains.includes(domain)) {
        console.log(`  + ${domain}`);
      }
    });

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    
    if (error.code === 'auth/insufficient-permission') {
      console.log('\n権限エラー: Service Accountに適切な権限がありません');
      console.log('Firebase Console でIAM権限を確認してください');
    }
  }
}

// スクリプト実行
setupAuthorizedDomains();