#!/bin/bash

echo "🔍 Gemini API Key チェックスクリプト"
echo "===================================="
echo ""

# 現在の環境変数を確認
echo "1. 現在のVercel環境変数:"
npx vercel env ls | grep GEMINI

echo ""
echo "2. Production環境の値を取得:"
npx vercel env pull .env.production.local

if [ -f .env.production.local ]; then
    echo ""
    echo "3. 取得した環境変数:"
    grep GEMINI .env.production.local || echo "GEMINI_API_KEYが見つかりません"
else
    echo "環境変数ファイルの取得に失敗しました"
fi

echo ""
echo "===================================="
echo "もしGEMINI_API_KEYが設定されていない場合:"
echo "1. https://makersuite.google.com/app/apikey でAPIキーを取得"
echo "2. 以下のコマンドを実行:"
echo "   npx vercel env add GEMINI_API_KEY production"
echo "3. APIキーを貼り付けてEnter"
echo "4. 再デプロイ: npx vercel --prod"