import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'SafeTrack Dashboard - Tourist Safety Monitoring',
  description: 'Real-time tourist safety monitoring dashboard with device tracking and alert management',
  generator: 'v0.dev',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}

/* Mobile-specific optimizations */
@media (max-width: 768px) {
  html {
    font-size: 14px;
  }
  
  body {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }
}

/* Prevent horizontal scroll on mobile */
body {
  overflow-x: hidden;
  width: 100%;
}

/* Mobile touch optimizations */
* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Allow text selection in specific areas */
input, textarea, [contenteditable] {
  -webkit-user-select: text;
  -khtml-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
