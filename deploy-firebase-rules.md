# Firebase ルールのデプロイ手順

## 方法1: ターミナルから（推奨）

1. ターミナルを開いて以下を実行:
```bash
firebase login
```

2. ブラウザが開くので、Googleアカウントでログイン

3. ログイン後、以下のコマンドを実行:
```bash
# Firestore ルールをデプロイ
firebase deploy --only firestore:rules

# Storage ルールをデプロイ  
firebase deploy --only storage:rules
```

## 方法2: Firebase Console から手動で設定

### Firestore ルールの設定:
1. https://console.firebase.google.com/project/crypto-talon-417715/firestore/rules にアクセス
2. 以下のルールをコピーして貼り付け:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみ読み書き可能
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. 「公開」をクリック

### Storage ルールの設定:
1. https://console.firebase.google.com/project/crypto-talon-417715/storage/rules にアクセス
2. 以下のルールをコピーして貼り付け:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ユーザーは自分のフォルダ内のファイルのみ読み書き可能
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. 「公開」をクリック

## 確認事項

✅ Firestore Database が有効になっている
✅ Authentication が有効になっている
✅ プロジェクトIDが `crypto-talon-417715` で正しい
✅ 環境変数が正しく設定されている

## トラブルシューティング

もし400エラーが続く場合:
1. Firebase Console でプロジェクトを確認
2. Firestore Database が作成されているか確認
3. Authentication プロバイダが設定されているか確認