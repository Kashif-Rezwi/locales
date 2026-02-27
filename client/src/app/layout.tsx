import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Locales — i18n Orchestration Engine',
  description: 'Automated end-to-end i18n pipeline for React applications',
};

/**
 * RootLayout — wraps every page in the shared font variables and providers.
 *
 * Providers includes SessionProvider (Auth.js) and QueryClientProvider
 * (@tanstack/react-query). Both require a client boundary, so Providers
 * is a 'use client' component imported here.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
