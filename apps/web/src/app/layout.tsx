import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import { GlobalNumberInputFix } from '@/components/layout/GlobalNumberInputFix';
import { PWAInstaller } from '@/components/common/PWAInstaller';
import { DeveloperModeBlocker } from '@/components/common/DeveloperModeBlocker';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#f1f5f9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'BizManage',
    template: '%s | BizManage',
  },
  applicationName: 'BizManage',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BizManage',
  },
  description: 'BizManage - Business Management & Accounting SaaS',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512x512.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192x192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512x512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#16192E" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BizManage" />
        <meta name="application-name" content="BizManage" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <DeveloperModeBlocker />
          <PWAInstaller />
          <GlobalNumberInputFix />
          <AuthProvider>{children}</AuthProvider>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'text-sm font-medium',
              style: {
                background: '#0f172a', // slate-900
                color: '#f1f5f9', // slate-100
                border: '1px solid #1e293b', // slate-800
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
              },
              success: {
                iconTheme: {
                  primary: '#10b981', // emerald-500
                  secondary: '#0f172a',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444', // red-500
                  secondary: '#0f172a',
                },
              },
            }} 
          />
        </QueryProvider>
      </body>
    </html>
  );
}
