import { Suspense } from 'react'
import './globals.css'
import Sidebar from './components/Sidebar'
import UserMenu from './components/UserMenu'
import AppShell from './components/AppShell'

export const metadata = {
  title: 'Vaccine Transport Monitoring',
  description: 'ระบบติดตามและรายงานการขนส่งวัคซีนด้วย IoT',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <AppShell
          sidebar={<Sidebar />}
          userMenu={
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  )
}