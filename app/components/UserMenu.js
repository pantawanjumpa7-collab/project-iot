import { connection } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { logout } from '../login/actions'

const roleLabels = { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน', driver: 'คนขับรถ' }

export default async function UserMenu() {
  await connection()
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, employee_code')
    .eq('id', userId)
    .single()

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: 14 }}>
      <span>
        {profile?.full_name || 'ผู้ใช้งาน'}
        {profile?.employee_code ? ` (${profile.employee_code})` : ''}
        {' · '}
        <strong>{roleLabels[profile?.role] || '-'}</strong>
      </span>
      <form action={logout}>
        <button type="submit"
          style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
          ออกจากระบบ
        </button>
      </form>
    </div>
  )
}