# Vercel認証を無効化する方法

## 問題
現在、本番URLがVercel認証で保護されており、401エラーが表示されています。

## 解決方法

### 方法1: Deployment Protectionを無効化（推奨）

1. **Vercel Dashboard にログイン**
   https://vercel.com/dashboard

2. **プロジェクトを選択**
   「business-card-manager」をクリック

3. **Settings → Deployment Protection**
   - 左メニューから「Deployment Protection」を探す
   - なければ「General」タブ内を確認

4. **Protection設定を変更**
   - 「Vercel Authentication」から「None」に変更
   - または「Standard Protection」を無効化

5. **Save をクリック**

### 方法2: Protection Bypass Token を使用

認証を維持したまま、自動アクセス用のトークンを生成：

1. **Settings → Deployment Protection**
2. **「Protection Bypass for Automation」セクション**
3. **「Generate Token」をクリック**
4. トークンをコピー

アクセス方法：
```
https://business-card-manager-production.vercel.app?x-vercel-protection-bypass=YOUR_TOKEN
```

### 方法3: プロジェクトを公開設定に

```bash
# vercel.jsonを更新（既に実施済み）
{
  "public": true
}

# 再デプロイ
npx vercel --prod
```

## Vercel Dashboard での設定場所

Settings内で以下のセクションを確認：
- **Deployment Protection**
- **Security**
- **General** → Advanced Settings

## 確認方法

設定変更後、以下のURLでアクセステスト：
https://business-card-manager-production.vercel.app

認証画面が表示されなければ成功です。

## 注意事項

- Vercel認証を無効化すると、誰でもアプリにアクセス可能になります
- Firebase認証でユーザー管理を行っているため、データは保護されています
- 開発環境（localhost）は影響を受けません