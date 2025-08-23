# Google認証の設定手順

## 1. Firebase Consoleで承認済みドメインを追加

### 手動設定が必要です（CLIでは設定できません）

1. **Firebase Console にアクセス**
   - https://console.firebase.google.com/project/crypto-talon-417715/authentication/settings

2. **「承認済みドメイン」タブを選択**

3. **以下のドメインを追加**
   ```
   business-card-manager.vercel.app
   business-card-manager-*.vercel.app
   *.business-card-manager.vercel.app
   business-card-manager-yasuus-projects.vercel.app
   business-card-manager-k3mg42i12-yasuus-projects.vercel.app
   ```

4. **各ドメインに対して「ドメインを追加」をクリック**

## 2. Google Cloud Console でOAuth同意画面を設定

1. **Google Cloud Console にアクセス**
   - https://console.cloud.google.com/apis/credentials/consent?project=crypto-talon-417715

2. **OAuth同意画面の設定**
   - アプリケーション名: Business Card Manager
   - ユーザーサポートメール: あなたのメールアドレス
   - 承認済みドメイン: 
     - business-card-manager.vercel.app
     - vercel.app

3. **OAuth 2.0 クライアント ID の確認**
   - https://console.cloud.google.com/apis/credentials?project=crypto-talon-417715
   - 「OAuth 2.0 クライアント ID」セクションを確認
   - 承認済みのJavaScript生成元に以下を追加：
     ```
     https://business-card-manager.vercel.app
     https://business-card-manager-k3mg42i12-yasuus-projects.vercel.app
     http://localhost:3000
     http://localhost:3002
     ```

## 3. エラーの一般的な原因と解決方法

### エラー: "Error 400: redirect_uri_mismatch"
- **原因**: リダイレクトURIが承認されていない
- **解決**: 上記の承認済みドメインとJavaScript生成元を追加

### エラー: "This app is blocked"
- **原因**: OAuth同意画面が未設定
- **解決**: Google Cloud ConsoleでOAuth同意画面を設定

### エラー: "popup_closed_by_user"
- **原因**: ポップアップがブロックされている
- **解決**: ブラウザのポップアップブロッカーを無効化

## 4. Firebase プロジェクトの確認

```bash
# Firebase プロジェクトの確認
firebase projects:list

# 現在のプロジェクトを確認
firebase use

# プロジェクトを切り替える場合
firebase use crypto-talon-417715
```

## 5. 動作確認

1. 本番環境: https://business-card-manager-k3mg42i12-yasuus-projects.vercel.app/auth
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントを選択
4. 認証が成功すればダッシュボードにリダイレクト

## 重要な注意事項

⚠️ **これらの設定はFirebase ConsoleとGoogle Cloud Consoleで手動で行う必要があります**
⚠️ CLIやAPIでは設定できません
⚠️ 設定後、反映まで数分かかる場合があります