import { Suspense } from 'react'
import { login } from './actions'

const messages = {
  invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  inactive: 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
}

async function ErrorMessage({ searchParams }) {
  const { error } = await searchParams
  const text = messages[error]
  if (!text) return null
  return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: 8, fontSize: 14 }}>
      {text}
    </div>
  )
}

export default function LoginPage({ searchParams }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 16 }}>
      <form
        action={login}
        style={{ width: '100%', maxWidth: 380, background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h1 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>ระบบติดตามการขนส่งวัคซีน</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>เข้าสู่ระบบสำหรับผู้ดูแล พนักงาน และคนขับ</p>

        <Suspense fallback={null}>
          <ErrorMessage searchParams={searchParams} />
        </Suspense>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#334155' }}>
          อีเมล
          <input name="email" type="email" required autoComplete="email"
            style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15 }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#334155' }}>
          รหัสผ่าน
          <input name="password" type="password" required autoComplete="current-password"
            style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15 }} />
        </label>

        <button type="submit"
          style={{ marginTop: 6, padding: '11px 12px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}>
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  )
}