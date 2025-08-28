#!/bin/bash

echo "Vercel プロジェクトのドメイン情報を確認中..."
echo ""

# Vercel CLIがインストールされているか確認
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLIがインストールされていません"
    echo "インストール: npm i -g vercel"
    exit 1
fi

echo "現在のプロジェクト情報:"
vercel list

echo ""
echo "プロジェクトのドメイン一覧:"
vercel domains ls

echo ""
echo "推奨設定:"
echo "1. Vercel Dashboard でカスタムドメインを設定"
echo "2. または、Production URL を固定化:"
echo "   - Vercel Project Settings → Domains"
echo "   - Production Branch: main"
echo ""
echo "Firebase承認済みドメインに追加すべきURL:"
echo "  - localhost (開発環境)"
echo "  - [your-custom-domain].vercel.app (固定URL)"
echo "  - business-card-manager-yasuus-projects.vercel.app (Production)"