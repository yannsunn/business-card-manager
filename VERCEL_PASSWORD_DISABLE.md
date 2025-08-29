# Vercel パスワード保護の無効化手順

## 方法1: Vercel Dashboard（推奨）

1. **Vercel Dashboardにアクセス**
   - https://vercel.com/dashboard
   - プロジェクト「business-card-manager」を選択

2. **Settings タブに移動**
   - プロジェクトページの上部メニューから「Settings」をクリック

3. **Password Protection を無効化**
   - 左サイドバーから「Security」を選択
   - 「Password Protection」セクションを探す
   - トグルスイッチを「OFF」にする
   - 「Save」をクリック

## 方法2: Vercel CLI

```bash
# プロジェクト設定を確認
npx vercel project ls

# 環境変数を確認（パスワード保護の設定含む）
npx vercel env pull

# プロジェクトにリンク
npx vercel link

# パスワード保護を無効化
npx vercel --prod --force
```

## 方法3: vercel.json で設定

```json
{
  "public": true
}
```

プロジェクトルートの `vercel.json` に上記を追加して再デプロイ。

## 確認方法

無効化後、以下のURLにアクセスして確認：
- https://business-card-manager-production.vercel.app

401エラーが表示されなくなれば成功です。

## トラブルシューティング

### まだ401エラーが出る場合

1. **キャッシュをクリア**
   - ブラウザのキャッシュをクリア
   - シークレットウィンドウで試す

2. **デプロイを再実行**
   ```bash
   npx vercel --prod
   ```

3. **Team設定を確認**
   - Teamアカウントの場合、Team設定も確認
   - Team Settings → Security → Password Protection

## 注意事項

- 無料プランでは一部のセキュリティ機能に制限があります
- パスワード保護を無効化すると、誰でもアクセス可能になります
- 本番環境では適切な認証機能（Firebase Auth）で保護することを推奨