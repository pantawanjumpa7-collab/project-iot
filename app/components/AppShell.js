'use client'

import { usePathname } from 'next/navigation'

export default function AppShell({ sidebar, userMenu, children }) {
  const pathname = usePathname()

  // หน้า Login: แสดงเฉพาะฟอร์ม ไม่มี Sidebar
  if (pathname.startsWith('/login')) {
    return children
  }

  return (
    <div className="app-shell">
      {sidebar}
      <main className="main-content">
        {userMenu}
        {children}
      </main>
    </div>
  )
}