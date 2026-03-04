import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://m057-yv-uf-msgw-phttd-dxfx.vercel.app'),

  title: 'EMCD All Things Crypto in One App',
  description:
    "An ecosystem for mining and working with cryptocurrencies powered by one of the world's top 7 mining pools.",
  generator: 'venus',

  openGraph: {
    type: 'website',
    url: 'https://m057-yv-uf-msgw-phttd-dxfx.vercel.app',
    title: 'EMCD All Things Crypto in One App',
    description:
      "An ecosystem for mining and working with cryptocurrencies powered by one of the world's top 7 mining pools.",
    images: [
      {
        url: 'https://i.im.ge/2026/03/04/eYVdSL.969883.jpeg',
        width: 1200,
        height: 630,
        alt: 'EMCD Crypto App Preview',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'EMCD All Things Crypto in One App',
    description:
      "An ecosystem for mining and working with cryptocurrencies powered by one of the world's top 7 mining pools.",
    images: ['https://i.im.ge/2026/03/04/eYVdSL.969883.jpeg'],
  },

  icons: {
    icon: 'https://i.im.ge/2026/03/04/eYVsVx.969902.jpeg',
    apple: 'https://i.im.ge/2026/03/04/eYVsVx.969902.jpeg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
