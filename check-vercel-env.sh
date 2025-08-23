#!/bin/bash

echo "========================================"
echo "Vercel環境変数の確認と設定"
echo "========================================"

# 環境変数の値を表示（最初の数文字のみ）
echo ""
echo "現在のVercel環境変数（Production）:"
vercel env pull .env.production

if [ -f ".env.production" ]; then
    echo ""
    echo "環境変数の内容（一部マスク）:"
    while IFS='=' read -r key value
    do
        if [[ ! -z "$key" && ! "$key" =~ ^# ]]; then
            # 値の最初の10文字だけ表示
            masked_value="${value:0:10}..."
            echo "$key=${masked_value}"
        fi
    done < .env.production
    
    # 一時ファイルを削除
    rm .env.production
else
    echo "環境変数の取得に失敗しました"
fi

echo ""
echo "========================================"
echo "環境変数が正しく設定されているか確認"
echo "========================================"

# 必要な環境変数のリスト
required_vars=(
    "NEXT_PUBLIC_FIREBASE_API_KEY"
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "NEXT_PUBLIC_FIREBASE_APP_ID"
    "GEMINI_API_KEY"
)

echo ""
echo "必須環境変数の確認:"
for var in "${required_vars[@]}"
do
    vercel env ls | grep -q "$var"
    if [ $? -eq 0 ]; then
        echo "✅ $var - 設定済み"
    else
        echo "❌ $var - 未設定"
    fi
done

echo ""
echo "========================================"
echo "推奨される対処法:"
echo "========================================"
echo "1. 上記で❌が表示された環境変数を設定してください"
echo "2. Vercelダッシュボードで設定する場合："
echo "   https://vercel.com/yasuus-projects/business-card-manager/settings/environment-variables"
echo ""
echo "3. CLIで設定する場合："
echo "   vercel env add VARIABLE_NAME production"
echo ""