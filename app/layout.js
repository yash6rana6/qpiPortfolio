import './globals.css'
import { AuthProvider } from '../components/AuthProvider.jsx'

export const metadata = {
  title: 'QPIE Digital — live shows, booked in seconds',
  description: 'Discover concerts, festivals and esports nights, and book your seats with QPIE.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-sand text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
