# 🚀 名刺管理システム - クイックセットアップガイド

## 📝 概要
このシステムはFirebaseを使用した名刺管理アプリケーションです。
OCR機能（Gemini AI）により、名刺画像から自動的に情報を抽出します。

## 🔧 セットアップ方法

### 方法1: 自動セットアップ（推奨）
```bash
./firebase-setup.sh
```
スクリプトの指示に従って必要な情報を入力してください。

### 方法2: 手動セットアップ

#### 1️⃣ Firebaseプロジェクトの作成
1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 新しいプロジェクトを作成

#### 2️⃣ 必要なサービスの有効化
- **Authentication**: メール/パスワード認証を有効化
- **Firestore Database**: 本番モードで作成（asia-northeast1推奨）
- **Storage**: 本番モードで作成

#### 3️⃣ 設定値の取得
1. **Webアプリの設定**
   - プロジェクトの概要 > Webアプリを追加
   - firebaseConfigの値をコピー

2. **サービスアカウントキー**
   - プロジェクト設定 > サービスアカウント
   - 新しい秘密鍵を生成してJSONをダウンロード

3. **Gemini APIキー**
   - [Google AI Studio](https://makersuite.google.com/app/apikey)
   - APIキーを作成

#### 4️⃣ 環境変数の設定
`.env.local`ファイルを編集して、取得した値を設定

#### 5️⃣ インストールと起動
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバーの起動
npm start
```

## 🌐 デプロイ

### Vercelへのデプロイ（推奨）
```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数の設定（Vercelダッシュボードから設定も可能）
vercel env add
```

### その他のプラットフォーム
- **Firebase Hosting**: `firebase deploy --only hosting`
- **Netlify**: GitHubと連携して自動デプロイ
- **独自サーバー**: Node.js環境で`npm start`

## 🔒 セキュリティ設定

### Firebaseルールのデプロイ
```bash
firebase deploy --only firestore:rules,storage:rules
```

### 環境変数の保護
- `.env.local`は絶対にGitにコミットしない
- 本番環境では環境変数をプラットフォームの設定で管理

## 📱 機能一覧
- ✅ 名刺画像のアップロード
- ✅ OCRによる自動テキスト抽出
- ✅ 名刺情報の編集・管理
- ✅ チーム共有機能
- ✅ Excelエクスポート
- ✅ QRコード読み取り
- ✅ n8n連携（オプション）

## 🆘 トラブルシューティング

### Firebaseエラー
```bash
# Firebase CLIの再ログイン
firebase logout
firebase login
```

### ビルドエラー
```bash
# キャッシュのクリア
rm -rf .next node_modules
npm install
npm run build
```

### 環境変数が読み込まれない
- `.env.local`ファイルの存在を確認
- 変数名が`NEXT_PUBLIC_`で始まっているか確認（クライアント側で使用する場合）

## 📞 サポート
問題が発生した場合は、以下の情報を含めて報告してください：
- エラーメッセージのスクリーンショット
- 実行したコマンド
- ブラウザのコンソールログ

## 📄 ライセンス
MIT License