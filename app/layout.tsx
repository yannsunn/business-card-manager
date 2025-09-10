import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorNotificationProvider } from '@/components/ErrorNotification';
import "./globals.css";

export const metadata: Metadata = {
  title: 'Business Card Manager',
  description: '名刺管理システム',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  themeColor: '#1f2937',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
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
