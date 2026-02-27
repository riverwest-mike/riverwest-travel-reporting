import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Playfair_Display } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RiverWest Properties · Travel Reporting',
  description: 'Mileage reimbursement tracking for RiverWest Properties',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={playfair.variable}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
