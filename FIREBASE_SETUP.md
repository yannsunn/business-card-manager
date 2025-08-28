# Firebase Google認証設定ガイド

## 現在の問題
Googleログインが機能しない場合は、Firebase Consoleで承認済みドメインの設定が必要です。

## 設定手順

### 1. Firebase Consoleにアクセス
1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクト `crypto-talon-417715` を選択

### 2. Google認証プロバイダーを有効化
1. 左側メニューから「Authentication」をクリック
2. 「Sign-in method」タブを選択
3. 「Google」をクリック
4. 「有効にする」をオン
5. プロジェクトのサポートメールアドレスを設定
6. 「保存」をクリック

### 3. 承認済みドメインを追加
1. 「Authentication」→「Settings」→「Authorized domains」
2. 以下のドメインが追加されていることを確認：
   - `localhost` (開発環境用)
   - `business-card-manager.vercel.app`
   - `business-card-manager-*.vercel.app` 
   - `*.vercel.app` (Vercelのプレビューデプロイ用)
   - `business-card-manager-yasuus-projects.vercel.app`
   - 現在使用中のVercelドメイン

### 4. OAuth同意画面の設定（必要な場合）
1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「OAuth同意画面」
4. 必要情報を入力：
   - アプリケーション名
   - サポートメールアドレス
   - 承認済みドメイン

### 5. Web クライアントIDの確認
1. Firebase Console → Project Settings → General
2. 「Web apps」セクションでアプリが登録されていることを確認
3. 設定が`.env.local`と一致していることを確認

## トラブルシューティング

### エラー: auth/unauthorized-domain
- Firebase Consoleで現在のドメインを承認済みドメインに追加

### エラー: auth/popup-blocked
- ブラウザのポップアップブロッカーを無効化
- または自動的にリダイレクト方式に切り替わります

### エラー: auth/operation-not-allowed
- Firebase ConsoleでGoogle認証が有効になっていることを確認

### エラー: auth/invalid-api-key
- `.env.local`のFirebase設定を確認
- Firebase Consoleの設定と一致していることを確認

## 環境変数の確認
`.env.local`に以下が設定されていることを確認：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=crypto-talon-417715
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 開発環境での確認
```bash
# 開発サーバー起動
npm run dev

# ブラウザのコンソールで以下を確認：
# - "Googleログイン開始..."
# - 現在のドメイン
# - エラーメッセージ
```