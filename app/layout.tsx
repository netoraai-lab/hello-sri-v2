import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hello Sri - Your AI Travel Guide',
  description: 'Ask Sri anything about Sri Lanka travel! Get personalized recommendations for places to visit, accommodations, transportation, and travel requirements. Powered by advanced AI technology.',
  keywords: [
    'Sri Lanka travel',
    'AI travel guide',
    'Sri Lanka tourism',
    'travel recommendations',
    'Sri Lanka hotels',
    'Sri Lanka transportation',
    'travel planning',
    'AI assistant',
    'Sri Lanka attractions',
    'Colombo travel',
    'Kandy travel',
    'Galle travel'
  ],
  authors: [{ name: 'Hello Sri' }],
  creator: 'Hello Sri',
  publisher: 'Hello Sri',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hello-sri.com',
    title: 'Hello Sri - Your AI Travel Guide',
    description: 'Ask Sri anything about Sri Lanka travel! Get personalized recommendations for places to visit, accommodations, transportation, and travel requirements. Powered by advanced AI technology.',
    siteName: 'Hello Sri',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Hello Sri - Your AI Travel Guide for Sri Lanka',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello Sri - Your AI Travel Guide',
    description: 'Ask Sri anything about Sri Lanka travel! Get personalized recommendations powered by AI.',
    images: ['/logo.png'],
    creator: '@HelloSri',
    site: '@HelloSri',
  },
  app: {
    name: 'Hello Sri',
    shortName: 'HelloSri',
    description: 'Your AI travel guide for Sri Lanka',
    startUrl: '/',
    display: 'standalone',
    backgroundColor: '#ffffff',
    themeColor: '#FF9D1E',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FF9D1E',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Hello Sri" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
