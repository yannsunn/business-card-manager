# 名刺管理システム

Firebase認証とFirestoreデータベースを使用した名刺管理システムです。

## 機能

- 📧 メール/パスワード認証
- 🔑 Googleソーシャルログイン
- 📸 名刺画像のアップロード（表・裏）
- 🤖 AI（Gemini）による名刺情報の自動抽出
- 📱 QRコード自動読み取り
- 💾 Firestoreでのデータ管理
- 🔍 名刺検索機能

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Authentication、Firestore、Storageを有効化
3. Googleログインプロバイダを設定
4. 承認済みドメインに`localhost`と本番ドメインを追加

### 3. 環境変数の設定

`.env.local`ファイルを作成：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini API Key (サーバーサイド)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Firestoreセキュリティルール

`firestore.rules`ファイルを使用してデプロイ：

```bash
firebase deploy --only firestore:rules
```

### 5. Firebase Storageセキュリティルール

`firebase-storage.rules`ファイルを使用してデプロイ：

```bash
firebase deploy --only storage:rules
```

## 開発環境での実行

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## Vercelへのデプロイ

### 1. Vercelにプロジェクトをインポート

1. [Vercel](https://vercel.com/)にログイン
2. "New Project"をクリック
3. GitHubリポジトリをインポート

### 2. 環境変数の設定

Vercelのプロジェクト設定で以下の環境変数を追加：

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `GEMINI_API_KEY`

### 3. デプロイ

```bash
vercel --prod
```

または、GitHubにpushすると自動的にデプロイされます。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: Firebase Authentication
- **データベース**: Firebase Firestore
- **ストレージ**: Firebase Storage
- **AI**: Google Gemini API
- **QRコード**: jsQR
- **デプロイ**: Vercel

## ライセンス

MIT# Deploy trigger Thu Aug 28 00:09:49 JST 2025
