# 名刺管理システム セットアップガイド

## 📋 必須の設定手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例: business-card-manager）
4. Google Analyticsを有効化（オプション）

### 2. Firebase設定の取得

#### Webアプリの登録
1. Firebaseコンソール > プロジェクトの概要 > Webアプリを追加
2. アプリ名を入力
3. 「Firebase SDKの追加」から設定値をコピー
4. `.env.local`の以下の値を更新：
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
   ```

#### Firebase Admin SDK設定
1. プロジェクト設定 > サービスアカウント
2. 「新しい秘密鍵の生成」をクリック
3. ダウンロードしたJSONファイルから以下を`.env.local`に設定：
   ```
   FIREBASE_ADMIN_PROJECT_ID=
   FIREBASE_ADMIN_CLIENT_EMAIL=
   FIREBASE_ADMIN_PRIVATE_KEY=
   ```

### 3. Firebase機能の有効化

#### Authentication
1. Firebaseコンソール > Authentication > Sign-in method
2. 「メール/パスワード」を有効化

#### Firestore Database
1. Firebaseコンソール > Firestore Database > データベースの作成
2. 本番モードで開始
3. ロケーションを選択（asia-northeast1推奨）

#### Storage
1. Firebaseコンソール > Storage > 始める
2. 本番モードで開始
3. ロケーションを選択（Firestoreと同じ）

### 4. Firebaseルールのデプロイ

```bash
# Firebase CLIのインストール（未インストールの場合）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトの初期化
firebase init

# ルールのデプロイ
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### 5. Gemini API キーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「APIキーを作成」をクリック
3. 生成されたキーを`.env.local`の`GEMINI_API_KEY`に設定

### 6. アプリケーションのビルドとデプロイ

#### ローカルでのテスト
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# http://localhost:3000 でアクセス
```

#### 本番ビルド
```bash
# ビルド
npm run build

# 本番サーバーの起動
npm start
```

### 7. Vercelへのデプロイ（推奨）

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ
vercel

# 環境変数の設定
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
# ... 他の環境変数も同様に設定

# 本番デプロイ
vercel --prod
```

## 🔒 セキュリティチェックリスト

- [ ] `.env.local`ファイルを`.gitignore`に含める
- [ ] Firebase認証を本番モードに設定
- [ ] Firestoreルールを適切に設定
- [ ] Storageルールを適切に設定
- [ ] CSRFトークンが生成されている
- [ ] APIキーが安全に管理されている
- [ ] HTTPSでのみアクセス可能

## 📝 運用開始前の確認

1. **環境変数の確認**
   - すべての必須環境変数が設定されているか
   - 本番用の値になっているか

2. **Firebase設定の確認**
   - Authentication、Firestore、Storageが有効か
   - セキュリティルールが適用されているか

3. **アクセステスト**
   - ユーザー登録・ログインが可能か
   - 名刺のアップロード・解析が動作するか
   - データの保存・取得が正常か

## 🚀 トラブルシューティング

### Firebase接続エラー
- Firebaseプロジェクトの設定値を再確認
- ブラウザのコンソールでエラーメッセージを確認

### Gemini API エラー
- APIキーが正しく設定されているか確認
- APIの利用上限に達していないか確認

### ビルドエラー
```bash
# キャッシュをクリア
rm -rf .next node_modules
npm install
npm run build
```

## 📞 サポート

問題が解決しない場合は、以下の情報と共にお問い合わせください：
- エラーメッセージ
- 実行したコマンド
- 環境変数の設定状況（機密情報は除く）