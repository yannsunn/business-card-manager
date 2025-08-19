#!/bin/bash

# Vercel環境変数設定スクリプト
echo "Vercel環境変数を設定します..."

# .env.localから環境変数を読み込んで設定
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production < <(echo "AIzaSyDCbSPpCkCed3fRQDRbkwdfQcHCRfPV1Kg")
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production < <(echo "crypto-talon-417715.firebaseapp.com")
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production < <(echo "crypto-talon-417715")
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production < <(echo "crypto-talon-417715.appspot.com")
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production < <(echo "1039056244945")
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production < <(echo "1:1039056244945:web:e67b9c4d047e547fd575f0")
vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production < <(echo "G-46D1QJKL5J")
vercel env add GEMINI_API_KEY production < <(echo "YOUR_GEMINI_API_KEY_HERE")

echo "環境変数の設定が完了しました。"