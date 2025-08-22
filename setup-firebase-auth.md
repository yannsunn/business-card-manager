# Firebase 認証設定ガイド

## 方法1: サービスアカウントキーを使用（推奨）

### 手順：

1. **Firebase Console でサービスアカウントキーを生成**:
   - https://console.firebase.google.com/project/crypto-talon-417715/settings/serviceaccounts/adminsdk にアクセス
   - 「新しい秘密鍵を生成」をクリック
   - JSONファイルがダウンロードされます（例: crypto-talon-417715-xxxxx.json）

2. **ダウンロードしたJSONファイルを配置**:
   - ファイルを `business-card-manager` フォルダに移動
   - ファイル名を `service-account-key.json` に変更

3. **環境変数を設定**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
   ```

4. **デプロイスクリプトを実行**:
   ```bash
   node deploy-rules.js
   ```

## 方法2: Firebase CLIでの対話型認証

### 手順：

1. **PowerShellまたはコマンドプロンプトを開く**

2. **Firebaseにログイン**:
   ```bash
   firebase login
   ```
   
3. **表示される内容**:
   - "Allow Firebase to collect CLI usage and error reporting information?" → Y を入力
   - ブラウザが自動的に開きます
   - Googleアカウントでログイン
   - "Firebase CLI wants to access your Google Account" → 「許可」をクリック
   - "Firebase CLI Login Successful" と表示されたら完了

4. **プロジェクトディレクトリに移動**:
   ```bash
   cd C:\Users\march\n8n名刺管理\business-card-manager
   ```

5. **ルールをデプロイ**:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   ```

## 方法3: CI用トークンを使用

### 手順：

1. **トークンを生成**（別のマシンで実行）:
   ```bash
   firebase login:ci
   ```
   - ブラウザでログイン
   - トークンが表示される（例: 1//0xxxxx-xxxxxx）

2. **トークンを使用してデプロイ**:
   ```bash
   firebase deploy --token "YOUR_TOKEN_HERE" --only firestore:rules
   ```

## トラブルシューティング

- **"Failed to authenticate" エラー**: 
  - `firebase logout` してから `firebase login` を再実行
  
- **ブラウザが開かない場合**:
  - `firebase login --no-localhost` を使用
  - 表示されたURLを手動でブラウザにコピー

- **権限エラー**:
  - Firebase ConsoleでIAM権限を確認
  - プロジェクトのオーナー権限があることを確認