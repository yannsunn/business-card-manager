'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorNotificationProvider } from '@/components/ErrorNotification';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1f2937" />
      </head>
      <body className="antialiased bg-gray-900 text-gray-200 min-h-screen">
        <ErrorBoundary>
          <ErrorNotificationProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ErrorNotificationProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
