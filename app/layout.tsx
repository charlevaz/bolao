import './globals.css'
import type { Metadata } from 'next'
import { getTheme } from '@/utils/theme'

export const metadata: Metadata = {
  title: 'Bolão Entrego Sumarezinho',
  description: 'Sistema de Bolão da Copa do Mundo 2026',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = getTheme();
  return (
    <html lang="pt-BR">
      <body style={{ backgroundColor: theme.backgroundColor, display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0 }}>
        <main className="main-container" style={{ flex: 1 }}>
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '10px', fontSize: '0.7rem', color: '#888', backgroundColor: '#f9f9f9', borderTop: '1px solid #eee' }}>
          by: grupo cr
        </footer>
      </body>
    </html>
  )
}
