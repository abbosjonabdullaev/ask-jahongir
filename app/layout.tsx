import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ask Jahongir',
  description:
    'A public-profile AI assistant for Jahongir Pulatov, inspired by the Ask Akmal experience.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 
