# Firebase 承認済みドメイン設定手順

## 現在の状況
Vercelへのデプロイごとに新しいURLが生成されるため、Firebase認証でエラーが発生しています。

## 解決方法

### 方法1: Firebase Consoleで承認済みドメインを追加

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト「crypto-talon-417715」を選択
3. 左メニューから「Authentication」を選択
4. 「Settings」タブをクリック
5. 「Authorized domains」セクションを見つける
6. 「Add domain」をクリックして以下のドメインを追加:
   - `business-card-manager-fbh7fm3jl-yasuus-projects.vercel.app`
   - `business-card-manager-gamma.vercel.app`
   - `business-card-manager-yasuus-projects.vercel.app`
   - `business-card-manager-production.vercel.app`

### 方法2: 固定URLを使用（推奨）

既存のエイリアスを使用:
- `business-card-manager-gamma.vercel.app`
- `business-card-manager-production.vercel.app`

これらのURLは既にFirebaseに登録済みの可能性があります。

## 今すぐ使用できるURL

以下のURLを試してください（既に承認済みの可能性があります）:
1. https://business-card-manager-production.vercel.app
2. https://business-card-manager-gamma.vercel.app

## 恒久的な解決策

カスタムドメインを設定することで、URLが変わらなくなります:
1. 独自ドメインを購入
2. Vercelでカスタムドメインを設定
3. Firebaseにカスタムドメインを一度だけ追加

## 緊急対応

現在のデプロイURL（business-card-manager-fbh7fm3jl-yasuus-projects.vercel.app）を
Firebase Consoleで承認済みドメインに追加してください。