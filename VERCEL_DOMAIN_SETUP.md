# Vercel カスタムドメイン設定ガイド

## 問題
Vercelは各デプロイで新しいサブドメインを生成するため、Firebase認証で毎回新しいドメインを承認する必要があります。

## 解決策

### オプション1: カスタムドメインを設定（推奨）

1. **Vercel Dashboardにアクセス**
   - https://vercel.com/dashboard
   - プロジェクト `business-card-manager` を選択

2. **Settings → Domains**
   - 「Add」をクリック
   - カスタムドメインを追加：
     - 例: `cards.yourdomain.com`
     - または: `business-cards.vercel.app` (Vercelのサブドメイン)

3. **DNS設定**
   - 独自ドメインの場合：DNSレコードを設定
   - Vercelサブドメインの場合：自動設定

4. **Firebase Consoleで承認**
   - Authentication → Settings → Authorized domains
   - カスタムドメインを追加（例: `cards.yourdomain.com`）

### オプション2: 固定デプロイURLを使用

1. **Production URLを固定**
   - Vercel Project Settings → Domains
   - Production branchを設定（通常は `main`）
   - Production URLが固定される

2. **Firebase設定**
   - Production URLのみをFirebase承認済みドメインに追加
   - 例: `business-card-manager-yasuus-projects.vercel.app`

### オプション3: プレビューデプロイを無効化

1. **Vercel Project Settings**
   - Git → Ignored Build Step
   - プレビューデプロイを無効化

2. **利点**
   - 新しいURLが生成されない
   - Firebase設定が簡単

## 現在の承認が必要なドメイン

以下のドメインをFirebase Consoleに追加してください：

```
localhost
business-card-manager.vercel.app
business-card-manager-yasuus-projects.vercel.app
business-card-manager-9ksaluzm2-yasuus-projects.vercel.app
```

## トラブルシューティング

### エラー: auth/unauthorized-domain
- ブラウザのコンソールで現在のドメインを確認
- そのドメインをFirebase承認済みドメインに追加

### Vercelの新しいデプロイURL
- デプロイごとに生成されるURL形式：
  - `business-card-manager-[hash]-yasuus-projects.vercel.app`
- hashは変わるため、都度追加が必要

## 推奨設定

1. **開発環境**: `localhost`
2. **ステージング**: `business-card-manager-staging.vercel.app`
3. **本番環境**: カスタムドメイン or 固定Production URL

これにより、Firebase設定を最小限に保てます。