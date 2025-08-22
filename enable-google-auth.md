# Google認証を有効化する手順

## 📱 Firebase ConsoleでGoogle認証を有効化

### 今すぐ実行：

1. **このリンクをクリック**
   👉 https://console.firebase.google.com/project/crypto-talon-417715/authentication/providers

2. **「Google」をクリック**
   - プロバイダーリストから「Google」を見つけてクリック

3. **「有効にする」をオンにする**
   - トグルスイッチをオンに

4. **設定を入力**
   - **プロジェクトの公開名**: 名刺管理システム
   - **サポートメール**: あなたのメールアドレスを選択

5. **「保存」をクリック**

## ✅ 完了！

これでGoogle認証が使えるようになります。

### テスト方法：
1. https://business-card-manager.vercel.app/auth にアクセス
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントを選択してログイン

## 🔧 もしエラーが出たら

### "redirect_uri_mismatch" エラー
- Firebase Console → Authentication → Settings → Authorized domains
- `business-card-manager.vercel.app` が追加されているか確認

### "このアプリは確認されていません" 
- 「詳細」→「安全でないページに移動」をクリックして続行（開発中は正常）
