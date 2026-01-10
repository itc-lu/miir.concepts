import type { Metadata } from 'next';
import './globals.css';

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
