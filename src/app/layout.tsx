import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: '🗺️ Trip Planner',
  description: 'A multi-user synchronized trip planning web application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
