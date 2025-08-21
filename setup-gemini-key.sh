#!/bin/bash

echo "=================================="
echo "Gemini API Key 設定スクリプト"
echo "=================================="
echo ""
echo "このスクリプトは安全にGemini API Keyを設定します。"
echo ""
echo "1. まず以下のURLからAPI Keyを取得してください："
echo "   https://aistudio.google.com/app/apikey"
echo ""
echo "2. 取得したAPI Keyを入力してください（入力は表示されません）："
read -s GEMINI_KEY

if [ -z "$GEMINI_KEY" ]; then
    echo ""
    echo "❌ エラー: API Keyが入力されていません"
    exit 1
fi

echo ""
echo "設定を開始します..."

# ローカル環境用の.env.localを更新
if [ -f .env.local ]; then
    # GEMINI_API_KEYの行を更新
    sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_KEY/" .env.local
    echo "✅ .env.localを更新しました"
fi

# Vercelの環境変数を更新
echo "Vercelの環境変数を更新中..."
vercel env rm GEMINI_API_KEY production -y 2>/dev/null
echo "$GEMINI_KEY" | vercel env add GEMINI_API_KEY production

echo ""
echo "✅ 設定が完了しました！"
echo ""
echo "次のステップ："
echo "1. 本番環境に反映するには: vercel --prod"
echo "2. ローカルで確認するには: npm run dev (再起動が必要)"
echo ""
echo "=================================="