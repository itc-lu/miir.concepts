import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'CAT - Cinema Automation Tool',
    template: '%s | CAT',
  },
  description:
    'Automate cinema program data collection, processing, and distribution for newspapers and websites in Luxembourg.',
  keywords: ['cinema', 'automation', 'Luxembourg', 'movie schedule', 'programming'],
  authors: [{ name: 'miir.concepts' }],
  creator: 'miir.concepts',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'CAT - Cinema Automation Tool',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
