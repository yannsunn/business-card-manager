#!/bin/bash

# 名刺管理システム デプロイスクリプト
# 使用方法: ./deploy.sh [development|production]

set -e

# カラー出力の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 環境の選択
ENV=${1:-production}

echo -e "${GREEN}🚀 名刺管理システム デプロイ開始${NC}"
echo -e "環境: ${YELLOW}$ENV${NC}"

# 環境変数チェック
echo -e "\n${YELLOW}📋 環境変数の確認...${NC}"
required_vars=(
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    "GEMINI_API_KEY"
    "CSRF_SECRET"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}❌ 以下の環境変数が設定されていません:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    echo -e "${YELLOW}`.env.local`ファイルを確認してください${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 環境変数OK${NC}"

# 依存関係のインストール
echo -e "\n${YELLOW}📦 依存関係のインストール...${NC}"
npm install

# Lintチェック
echo -e "\n${YELLOW}🔍 コード品質チェック...${NC}"
npm run lint || {
    echo -e "${YELLOW}⚠️  Lint警告があります（続行します）${NC}"
}

# ビルド
echo -e "\n${YELLOW}🔨 ビルド中...${NC}"
npm run build

# Firebaseルールのデプロイ（オプション）
if command -v firebase &> /dev/null; then
    echo -e "\n${YELLOW}📝 Firebaseルールのデプロイ...${NC}"
    firebase deploy --only firestore:rules,storage:rules,firestore:indexes
else
    echo -e "${YELLOW}⚠️  Firebase CLIがインストールされていません${NC}"
    echo -e "ルールのデプロイをスキップします"
fi

# デプロイ先の選択
echo -e "\n${YELLOW}🎯 デプロイ先を選択してください:${NC}"
echo "1) Vercel"
echo "2) Firebase Hosting"
echo "3) ローカルサーバー起動のみ"
read -p "選択 (1-3): " deploy_choice

case $deploy_choice in
    1)
        echo -e "\n${GREEN}📤 Vercelへデプロイ中...${NC}"
        if [ "$ENV" = "production" ]; then
            vercel --prod
        else
            vercel
        fi
        ;;
    2)
        echo -e "\n${GREEN}📤 Firebase Hostingへデプロイ中...${NC}"
        # Next.jsのエクスポート
        npm run build
        npx next export -o out
        firebase deploy --only hosting
        ;;
    3)
        echo -e "\n${GREEN}🖥️  ローカルサーバーを起動します...${NC}"
        npm start
        ;;
    *)
        echo -e "${RED}❌ 無効な選択です${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✨ デプロイ完了！${NC}"
echo -e "${YELLOW}📌 重要な確認事項:${NC}"
echo "- Firebase Authenticationが有効になっているか"
echo "- Firestoreが作成されているか"
echo "- Storageが作成されているか"
echo "- 本番環境のURLが正しく設定されているか"