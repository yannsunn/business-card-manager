# 🎉 セットアップ完了

## 本番環境URL（固定）
**https://business-card-manager-production.vercel.app**

このURLは固定されており、新しいデプロイでも変更されません。

## Firebase設定

### 必要な手順（1回のみ）

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクト `crypto-talon-417715` を選択
3. **Authentication → Settings → Authorized domains**
4. 以下のドメインを追加：
   - `localhost` (開発用)
   - `business-card-manager-production.vercel.app` (本番用・固定)
   - `business-card-manager-yasuus-projects.vercel.app` (メインドメイン)

## 利点

- ✅ デプロイごとにFirebaseを更新する必要なし
- ✅ 固定URLなので設定が簡単
- ✅ ユーザーにとってもURLが覚えやすい

## 開発フロー

1. **開発**: `npm run dev` (localhost:3000)
2. **デプロイ**: `git push origin main`
3. **本番URL**: https://business-card-manager-production.vercel.app

## トラブルシューティング

### Googleログインが動作しない場合

1. ブラウザのコンソールでエラーを確認
2. 「auth/unauthorized-domain」エラーの場合：
   - エラーメッセージに表示されるドメインをFirebaseに追加
3. ポップアップがブロックされる場合：
   - ブラウザの設定でポップアップを許可

## 環境変数の確認

`.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=crypto-talon-417715.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=crypto-talon-417715
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 完了チェックリスト

- [x] Vercel固定URLの作成
- [x] セキュリティ設定の簡素化
- [x] 画像品質の最適化（OCR精度向上）
- [ ] Firebase承認済みドメインに固定URLを追加（手動で実施必要）

---

**次のステップ**: Firebase Consoleで固定URLを承認済みドメインに追加してください。