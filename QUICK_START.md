# 🚀 名刺管理システム - クイックスタート

## ✅ セットアップ完了状況

### 作成済みファイル
- ✅ Firebase設定ファイル（`firebase.json`, `firestore.rules`, `storage.rules`）
- ✅ 環境変数テンプレート（`.env.local`, `.env.production`）
- ✅ セキュリティキー（自動生成済み）
- ✅ デプロイスクリプト（`deploy.sh`）
- ✅ セットアップスクリプト（`firebase-setup.sh`）

### 必要な設定

## 🔴 必須: Firebaseプロジェクトの作成

### 手順1: Firebaseコンソールでプロジェクト作成
1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを作成」
3. プロジェクト名: `business-card-manager-[日付]`
4. Google Analytics: 任意

### 手順2: Webアプリの追加
1. プロジェクトの概要 > Webアプリを追加（</> アイコン）
2. アプリ名: `Business Card Manager`
3. 設定値をコピー

### 手順3: 機能の有効化
1. **Authentication**
   - Sign-in method > メール/パスワードを有効化
   
2. **Firestore Database**
   - データベースの作成 > 本番モード
   - ロケーション: asia-northeast1（東京）
   
3. **Storage**
   - 始める > 本番モード
   - ロケーション: Firestoreと同じ

### 手順4: Gemini APIキーの取得
1. https://makersuite.google.com/app/apikey
2. 「APIキーを作成」
3. キーをコピー

## 📝 環境変数の設定

`.env.local`ファイルを編集して、以下の値を実際の値に置き換えてください：

```env
# Firebaseコンソールから取得
NEXT_PUBLIC_FIREBASE_API_KEY=実際の値
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=実際の値
NEXT_PUBLIC_FIREBASE_PROJECT_ID=実際の値
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=実際の値
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=実際の値
NEXT_PUBLIC_FIREBASE_APP_ID=実際の値

# Google AI Studioから取得
GEMINI_API_KEY=実際の値

# サービスアカウント（プロジェクト設定 > サービスアカウント）
FIREBASE_ADMIN_PROJECT_ID=実際の値
FIREBASE_ADMIN_CLIENT_EMAIL=実際の値
FIREBASE_ADMIN_PRIVATE_KEY="実際の値"
```

## 🖥️ ローカルでの起動

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ブラウザで開く
http://localhost:3000
```

## 🌐 Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数の設定（対話式）
vercel env add
```

または、Vercelダッシュボードから：
1. https://vercel.com/dashboard
2. プロジェクトを選択
3. Settings > Environment Variables
4. 各環境変数を追加

## ⚠️ 重要な注意事項

### セキュリティキー
以下のキーは既に生成済みです（`.env.local`内）：
- CSRF_SECRET: `e811fdcb6d4329b165bb2a0c3ef99d99876c5d737987a777cc4535cfba10f831`
- API_SECRET_KEY: `04e18e5301656033bf32b3e592e4ad3c08fc40c39970f807a98fdc7f6eee19e4...`

### 必須環境変数
アプリケーションが動作するには、最低限以下が必要です：
- Firebase設定（全項目）
- GEMINI_API_KEY
- CSRF_SECRET
- API_SECRET_KEY

## 🆘 トラブルシューティング

### ビルドエラー
```bash
# クリーンインストール
rm -rf node_modules .next
npm install
npm run build
```

### メモリ不足エラー
```bash
# メモリ制限を増やす
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Firebase接続エラー
- Firebaseプロジェクトが作成されているか確認
- Authentication、Firestore、Storageが有効になっているか確認
- 環境変数が正しく設定されているか確認

## 📞 サポート

設定に問題がある場合は、以下を確認してください：
1. すべての環境変数が設定されているか
2. Firebaseの3つのサービスが有効になっているか
3. ブラウザのコンソールにエラーメッセージが出ていないか

---

**現在の状態**: コードは完成しており、Firebaseの設定値を入力すれば即座に動作します。