#!/bin/bash

echo "🔧 Gemini API Key 修正スクリプト"
echo "=================================="
echo ""

# 既存の環境変数を削除
echo "1. 既存のGEMINI_API_KEYを削除..."
echo "y" | npx vercel env rm GEMINI_API_KEY production 2>&1 | tail -1

echo ""
echo "2. 新しいGEMINI_API_KEYを設定してください:"
echo ""
echo "以下のコマンドを実行:"
echo ""
echo "npx vercel env add GEMINI_API_KEY production"
echo ""
echo "その後、Gemini APIキーを貼り付けてEnter"
echo ""
echo "APIキーは以下から取得:"
echo "https://makersuite.google.com/app/apikey"
echo ""
echo "=================================="
echo "設定後、以下のコマンドで再デプロイ:"
echo "npx vercel --prod"