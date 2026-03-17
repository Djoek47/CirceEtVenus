import type { Metadata, Viewport } from 'next'
import { Cinzel, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { CookieConsent } from '@/components/cookie-consent'
import './globals.css'

const cinzel = Cinzel({ 
  subsets: ["latin"],
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700']
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700']
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://circe-venus.vercel.app'),
  title: 'Circe et Venus - Divine Creator Management',
  description:
    'Mythological AI-powered platform for content creators. Circe for retention & protection, Venus for growth & seduction. Manage fans, content, analytics with divine precision.',
  keywords: [
    'creator management',
    'OnlyFans',
    'MYM',
    'Fansly',
    'content creator',
    'fan management',
    'AI assistant',
    'astrology',
    'Circe',
    'Venus',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Circe et Venus - Divine Creator Management',
    description:
      'Mythological AI-powered platform for content creators. Circe for retention & protection, Venus for growth & seduction.',
    siteName: 'Circe et Venus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Circe et Venus - Divine Creator Management',
    description:
      'Mythological AI-powered platform for content creators. Circe for retention & protection, Venus for growth & seduction.',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {gscVerification && (
          <meta name="google-site-verification" content={gscVerification} />
        )}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Circe et Venus',
              url: 'https://circe-venus.vercel.app',
              logo: 'https://circe-venus.vercel.app/icon.png',
            }),
          }}
        />
      </head>
      <body className={`${cinzel.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsent />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
