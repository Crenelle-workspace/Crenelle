import type { Metadata } from 'next'
import { Cormorant_Garamond, Syne } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { SentryUserProvider } from '@/components/sentry-user-provider'
import { JsonLd } from '@/components/seo/json-ld'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crenelle.org'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  // 300 (light) dropped — no `font-light` usage in the app.
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://crenelle.org'),
  title: {
    default: 'Crenelle — Event Access Management',
    template: '%s | Crenelle',
  },
  description: 'Issue QR-coded entry passes, scan guests in real-time, and take full control of every door.',
  applicationName: 'Crenelle',
  keywords: [
    'event access management',
    'event ticketing',
    'QR code tickets',
    'guest check-in',
    'event registration',
    'door management',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/Brand Logos/CRENELLE FAVICON W.png', media: '(prefers-color-scheme: dark)' },
      { url: '/Brand Logos/CRENELLE FAVICON B.png', media: '(prefers-color-scheme: light)' },
    ],
    shortcut: '/Brand Logos/CRENELLE FAVICON B.png',
    apple: '/Brand Logos/CRENELLE FAVICON B.png',
  },
  openGraph: {
    title: 'Crenelle — Event Access Management',
    description: 'Issue QR-coded entry passes, scan guests in real-time, and take full control of every door.',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Crenelle — Event Access Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crenelle — Event Access Management',
    description: 'Issue QR-coded entry passes, scan guests in real-time, and take full control of every door.',
    images: ['/og-image.png'],
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Crenelle',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description:
    'Event access management — issue QR-coded entry passes, scan guests in real-time, and take full control of every door.',
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Crenelle',
  url: SITE_URL,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cormorant.variable} ${syne.variable} antialiased font-sans grain`}>
        <JsonLd data={[organizationSchema, websiteSchema]} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SentryUserProvider />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
