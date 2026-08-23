import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import { GlobalNumberInputFix } from '@/components/layout/GlobalNumberInputFix';
import { PWAInstaller } from '@/components/common/PWAInstaller';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BizManage - Business Management & Accounting SaaS',
  description: 'Manage sales, purchases, inventory, cashflow, and financial reports in one place.',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
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
