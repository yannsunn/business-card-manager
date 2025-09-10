#!/bin/bash

# Firebase自動セットアップスクリプト
# このスクリプトはFirebaseプロジェクトの初期設定を支援します

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔥 Firebase プロジェクトセットアップ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}📋 必要な作業：${NC}"
echo -e "1. Firebaseコンソールでプロジェクトを作成"
echo -e "2. Webアプリを追加して設定値を取得"
echo -e "3. Authentication、Firestore、Storageを有効化"
echo -e "4. サービスアカウントキーを生成"
echo -e "5. Gemini APIキーを取得"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ステップ 1: Firebaseプロジェクトの作成${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n1. 以下のURLを開いてください："
echo -e "   ${GREEN}https://console.firebase.google.com/${NC}"
echo -e "\n2. 「プロジェクトを作成」をクリック"
echo -e "3. プロジェクト名を入力（例: business-card-manager-$(date +%Y%m%d)）"
echo -e "4. Google Analyticsは任意で設定"

read -p "$(echo -e ${YELLOW}プロジェクトを作成したら Enter キーを押してください...${NC})"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ステップ 2: Webアプリの設定値を取得${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n1. Firebaseコンソール > プロジェクトの概要 > Webアプリを追加（</> アイコン）"
echo -e "2. アプリ名を入力（例: Business Card Manager Web）"
echo -e "3. 「Firebase Hosting」はチェック不要"
echo -e "4. 「アプリを登録」をクリック"
echo -e "5. 表示されたfirebaseConfig値をコピー"

echo -e "\n${GREEN}設定値を入力してください：${NC}"

read -p "FIREBASE_API_KEY: " FIREBASE_API_KEY
read -p "FIREBASE_AUTH_DOMAIN: " FIREBASE_AUTH_DOMAIN
read -p "FIREBASE_PROJECT_ID: " FIREBASE_PROJECT_ID
read -p "FIREBASE_STORAGE_BUCKET: " FIREBASE_STORAGE_BUCKET
read -p "FIREBASE_MESSAGING_SENDER_ID: " FIREBASE_MESSAGING_SENDER_ID
read -p "FIREBASE_APP_ID: " FIREBASE_APP_ID
read -p "FIREBASE_MEASUREMENT_ID (省略可): " FIREBASE_MEASUREMENT_ID

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ステップ 3: Firebase機能の有効化${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}3-1. Authentication の有効化：${NC}"
echo -e "1. Firebaseコンソール > Authentication > 始める"
echo -e "2. Sign-in method タブ > メール/パスワード を有効化"
read -p "$(echo -e ${YELLOW}完了したら Enter キーを押してください...${NC})"

echo -e "\n${YELLOW}3-2. Firestore Database の作成：${NC}"
echo -e "1. Firebaseコンソール > Firestore Database > データベースの作成"
echo -e "2. 「本番モード」を選択"
echo -e "3. ロケーション: asia-northeast1 (東京) または asia-northeast2 (大阪) を選択"
read -p "$(echo -e ${YELLOW}完了したら Enter キーを押してください...${NC})"

echo -e "\n${YELLOW}3-3. Storage の作成：${NC}"
echo -e "1. Firebaseコンソール > Storage > 始める"
echo -e "2. 「本番モード」を選択"
echo -e "3. ロケーション: Firestoreと同じロケーションを選択"
read -p "$(echo -e ${YELLOW}完了したら Enter キーを押してください...${NC})"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ステップ 4: サービスアカウントキーの生成${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n1. Firebaseコンソール > プロジェクト設定（歯車アイコン）"
echo -e "2. 「サービスアカウント」タブ"
echo -e "3. 「新しい秘密鍵の生成」をクリック"
echo -e "4. JSONファイルがダウンロードされます"
echo -e "\n${YELLOW}JSONファイルから以下の値を確認してください：${NC}"

read -p "client_email の値: " FIREBASE_CLIENT_EMAIL
echo -e "${YELLOW}private_key の値を入力（改行を \\n に置換した1行で）：${NC}"
read -p "> " FIREBASE_PRIVATE_KEY

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ステップ 5: Gemini API キーの取得${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n1. 以下のURLを開いてください："
echo -e "   ${GREEN}https://makersuite.google.com/app/apikey${NC}"
echo -e "2. 「APIキーを作成」をクリック"
echo -e "3. 生成されたAPIキーをコピー"

read -p "Gemini API Key: " GEMINI_API_KEY

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}環境変数ファイルの生成${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# .env.localファイルの生成
cat > .env.local << EOF
# ===================================
# 名刺管理システム 環境変数設定
# 自動生成日: $(date)
# ===================================

# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$FIREBASE_MEASUREMENT_ID

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=$FIREBASE_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY"

# Google Gemini AI API
GEMINI_API_KEY=$GEMINI_API_KEY

# n8n Webhook設定（オプション）
N8N_WEBHOOK_URL=

# セキュリティ設定（自動生成）
NEXT_PUBLIC_APP_ENV=production
CSRF_SECRET=$(openssl rand -hex 32)
API_SECRET_KEY=$(openssl rand -hex 64)

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production
EOF

# .firebasercファイルの更新
cat > .firebaserc << EOF
{
  "projects": {
    "default": "$FIREBASE_PROJECT_ID"
  }
}
EOF

echo -e "\n${GREEN}✅ 設定ファイルを生成しました！${NC}"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Firebase ルールのデプロイ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Firebaseにログインします...${NC}"
echo -e "ブラウザが開いたらGoogleアカウントでログインしてください"
firebase login

echo -e "\n${YELLOW}セキュリティルールをデプロイします...${NC}"
firebase deploy --only firestore:rules,storage:rules,firestore:indexes

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 セットアップ完了！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}次のステップ：${NC}"
echo -e "1. npm install    # 依存関係のインストール"
echo -e "2. npm run dev    # 開発サーバーの起動"
echo -e "3. npm run build  # 本番ビルド"
echo -e "4. ./deploy.sh    # デプロイ"

echo -e "\n${GREEN}アプリケーションURL: http://localhost:3000${NC}"