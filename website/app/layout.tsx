import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { Providers } from '@/components/providers/Providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VFL Manager - Ultimate Madden Franchise Management',
  description: 'The ultimate Madden franchise management system. Track stats, manage trades, and stay connected with your league like never before.',
  keywords: ['Madden', 'NFL', 'franchise', 'league', 'management', 'Discord', 'bot'],
  authors: [{ name: 'VFL Manager Team' }],
  openGraph: {
    title: 'VFL Manager - Ultimate Madden Franchise Management',
    description: 'The ultimate Madden franchise management system. Track stats, manage trades, and stay connected with your league like never before.',
    url: 'https://maddenvfl.com',
    siteName: 'VFL Manager',
    images: [
      {
        url: 'https://maddenvfl.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'VFL Manager - Madden Franchise Management',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VFL Manager - Ultimate Madden Franchise Management',
    description: 'The ultimate Madden franchise management system. Track stats, manage trades, and stay connected with your league like never before.',
    images: ['https://maddenvfl.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#FF6B35" />
      </head>
      <body className={`${inter.className} bg-slate-900 text-white antialiased`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}