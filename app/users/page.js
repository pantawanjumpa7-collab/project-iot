import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { createUser, updateUser, resetPassword } from './actions'
import * as ui from '../components/formStyles'

const roleLabels = { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน', driver: 'คนขับรถ' }

const okBox = {
  background: '#dcfce7',
  color: '#166534',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
  marginBottom: 16,
}

export default function UsersPage({ searchParams }) {
  return (
    <div>
      <h1 style={ui.title}>จัดการผู้ใช้งาน</h1>
      <p style={ui.subtitle}>สร้างบัญชี กำหนดบทบาท และปิดการใช้งานบัญชีพนักงานและคนขับ</p>
      <Suspense fallback={<p>กำลังโหลด...</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Content({ searchParams }) {
  await connection()
  const { error, ok } = await searchParams
  const supabase = await createClient()

  const { data: role } = await supabase.rpc('my_role')

  if (role !== 'admin') {
    return <div style={ui.errorBox}>หน้านี้ใช้ได้เฉพาะผู้ดูแลระบบ (Admin)</div>
  }

  const { data: claims } = await supabase.auth.getClaims()
  const myId = claims?.claims?.sub

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, employee_code, phone, role, is_active')
    .order('role')
    .order('employee_code')

  const small = { ...ui.input, padding: '6px 8px', fontSize: 13 }

  return (
    <>
      {error && <div style={ui.errorBox}>{error}</div>}
      {ok && <div style={okBox}>{ok}</div>}

      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>เพิ่มผู้ใช้ใหม่</h2>
        <form action={createUser} style={ui.grid}>
          <label style={ui.label}>อีเมล *
            <input name="email" type="email" required placeholder="driver02@example.com" style={ui.input} />
          </label>
          <label style={ui.label}>รหัสผ่าน * (อย่างน้อย 6 ตัว)
            <input name="password" type="text" required minLength={6} style={ui.input} />
          </label>
          <label style={ui.label}>ชื่อ-นามสกุล *
            <input name="full_name" required style={ui.input} />
          </label>
          <label style={ui.label}>รหัสพนักงาน
            <input name="employee_code" placeholder="DRV-002" style={ui.input} />
          </label>
          <label style={ui.label}>เบอร์โทรศัพท์
            <input name="phone" placeholder="08xxxxxxxx" style={ui.input} />
          </label>
          <label style={ui.label}>บทบาท *
            <select name="role" defaultValue="driver" style={ui.input}>
              <option value="driver">คนขับรถ</option>
              <option value="staff">พนักงาน</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </label>
          <button type="submit" style={ui.primaryBtn}>สร้างบัญชี</button>
        </form>
      </div>

      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>ผู้ใช้ทั้งหมด ({users?.length || 0})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>อีเมล</th>
                <th style={ui.th}>ชื่อ-นามสกุล</th>
                <th style={ui.th}>รหัส</th>
                <th style={ui.th}>เบอร์โทร</th>
                <th style={ui.th}>บทบาท</th>
                <th style={ui.th}>สถานะ</th>
                <th style={ui.th}></th>
                <th style={ui.th}>รีเซ็ตรหัสผ่าน</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u) => {
                const formId = `user-${u.id}`
                const isMe = u.id === myId
                return (
                  <tr key={u.id} style={u.is_active ? undefined : { opacity: 0.55 }}>
                    <td style={ui.td}>
                      {u.email}
                      {isMe && <div style={{ fontSize: 12, color: '#0f766e' }}>(บัญชีของคุณ)</div>}
                    </td>
                    <td style={ui.td}>
                      <input form={formId} name="full_name" defaultValue={u.full_name} style={small} />
                    </td>
                    <td style={ui.td}>
                      <input form={formId} name="employee_code" defaultValue={u.employee_code || ''} style={{ ...small, width: 100 }} />
                    </td>
                    <td style={ui.td}>
                      <input form={formId} name="phone" defaultValue={u.phone || ''} style={{ ...small, width: 120 }} />
                    </td>
                    <td style={ui.td}>
                      <select form={formId} name="role" defaultValue={u.role} style={{ ...small, width: 'auto' }}>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={ui.td}>
                      <select form={formId} name="is_active" defaultValue={String(u.is_active)} style={{ ...small, width: 'auto' }}>
                        <option value="true">ใช้งาน</option>
                        <option value="false">ปิดใช้งาน</option>
                      </select>
                    </td>
                    <td style={ui.td}>
                      <form id={formId} action={updateUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" style={ui.smallBtn}>บันทึก</button>
                      </form>
                    </td>
                    <td style={ui.td}>
                      <form action={resetPassword} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input name="password" type="text" minLength={6} required placeholder="รหัสใหม่" style={{ ...small, width: 110 }} />
                        <button type="submit" style={ui.smallBtn}>เปลี่ยน</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 12, marginBottom: 0 }}>
          แนะนำให้ &ldquo;ปิดใช้งาน&rdquo; แทนการลบบัญชี เพื่อเก็บประวัติเที่ยวขนส่งไว้ บัญชีที่ปิดใช้งานจะล็อกอินไม่ได้ทันที
        </p>
      </div>
    </>
  )
}