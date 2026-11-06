import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { createBox, updateBoxStatus, deleteBox } from './actions'
import * as ui from '../components/formStyles'

const statusInfo = {
  available: { label: 'พร้อมใช้งาน', bg: '#dcfce7', color: '#166534' },
  in_transit: { label: 'กำลังขนส่ง', bg: '#dbeafe', color: '#1e40af' },
  maintenance: { label: 'รอตรวจสอบ/ซ่อม', bg: '#fef3c7', color: '#92400e' },
}

export default function BoxesPage({ searchParams }) {
  return (
    <div>
      <h1 style={ui.title}>กล่องวัคซีน</h1>
      <p style={ui.subtitle}>จัดการกล่องวัคซีนและจับคู่กับอุปกรณ์ IoT ใน ThingsBoard</p>
      <Suspense fallback={<p>กำลังโหลด...</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Content({ searchParams }) {
  await connection()
  const { error } = await searchParams
  const supabase = await createClient()

  const [{ data: role }, { data: boxes }] = await Promise.all([
    supabase.rpc('my_role'),
    supabase.from('vaccine_boxes').select('*').order('box_code'),
  ])
  const canEdit = role === 'admin' || role === 'staff'

  return (
    <>
      {error && <div style={ui.errorBox}>{error}</div>}

      {canEdit && (
        <div style={ui.card}>
          <h2 style={ui.sectionTitle}>เพิ่มกล่องวัคซีน</h2>
          <form action={createBox} style={ui.grid}>
            <label style={ui.label}>รหัสกล่อง
              <input name="box_code" required placeholder="VC-002" style={ui.input} />
            </label>
            <label style={ui.label}>ชื่อกล่อง
              <input name="name" placeholder="กล่องวัคซีน 2" style={ui.input} />
            </label>
            <label style={ui.label}>Device ID (ThingsBoard)
              <input name="tb_device_id" placeholder="ถ้ายังไม่มีอุปกรณ์ เว้นว่างได้" style={ui.input} />
            </label>
            <label style={ui.label}>หมายเหตุ
              <input name="note" style={ui.input} />
            </label>
            <button type="submit" style={ui.primaryBtn}>บันทึก</button>
          </form>
        </div>
      )}

      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>รายการทั้งหมด ({boxes?.length || 0})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>รหัสกล่อง</th>
                <th style={ui.th}>ชื่อ</th>
                <th style={ui.th}>Device ID</th>
                <th style={ui.th}>สถานะ</th>
                <th style={ui.th}>หมายเหตุ</th>
                {canEdit && <th style={ui.th}></th>}
              </tr>
            </thead>
            <tbody>
              {(boxes || []).map((b) => {
                const s = statusInfo[b.status] || statusInfo.available
                return (
                  <tr key={b.id}>
                    <td style={ui.td}><strong>{b.box_code}</strong></td>
                    <td style={ui.td}>{b.name || '-'}</td>
                    <td style={{ ...ui.td, fontFamily: 'monospace', fontSize: 12 }} title={b.tb_device_id || ''}>
                      {b.tb_device_id ? b.tb_device_id.slice(0, 8) + '…' : <span style={{ color: '#94a3b8' }}>ยังไม่ผูก</span>}
                    </td>
                    <td style={ui.td}>
                      <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={ui.td}>{b.note || '-'}</td>
                    {canEdit && (
                      <td style={{ ...ui.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <form action={updateBoxStatus} style={{ display: 'flex', gap: 6 }}>
                            <input type="hidden" name="id" value={b.id} />
                            <select name="status" defaultValue={b.status} style={{ ...ui.input, width: 'auto', padding: '6px 8px' }}>
                              {Object.entries(statusInfo).map(([value, info]) => (
                                <option key={value} value={value}>{info.label}</option>
                              ))}
                            </select>
                            <button type="submit" style={ui.smallBtn}>เปลี่ยน</button>
                          </form>
                          <form action={deleteBox}>
                            <input type="hidden" name="id" value={b.id} />
                            <button type="submit" style={ui.dangerBtn}>ลบ</button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {(!boxes || boxes.length === 0) && (
                <tr><td colSpan={6} style={ui.empty}>ยังไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}