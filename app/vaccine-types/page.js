import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { createVaccineType, deleteVaccineType } from './actions'
import * as ui from '../components/formStyles'

export default function VaccineTypesPage({ searchParams }) {
  return (
    <div>
      <h1 style={ui.title}>ประเภทวัคซีน</h1>
      <p style={ui.subtitle}>กำหนดชนิดวัคซีนและช่วงอุณหภูมิที่อนุญาตระหว่างขนส่ง</p>
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

  const [{ data: role }, { data: types }] = await Promise.all([
    supabase.rpc('my_role'),
    supabase.from('vaccine_types').select('*').order('code'),
  ])
  const canEdit = role === 'admin' || role === 'staff'

  return (
    <>
      {error && <div style={ui.errorBox}>{error}</div>}

      {canEdit && (
        <div style={ui.card}>
          <h2 style={ui.sectionTitle}>เพิ่มประเภทวัคซีน</h2>
          <form action={createVaccineType} style={ui.grid}>
            <label style={ui.label}>รหัส
              <input name="code" required placeholder="VT-002" style={ui.input} />
            </label>
            <label style={ui.label}>ชื่อวัคซีน
              <input name="name" required style={ui.input} />
            </label>
            <label style={ui.label}>อุณหภูมิต่ำสุด (°C)
              <input name="min_temp" type="number" step="0.1" required placeholder="2" style={ui.input} />
            </label>
            <label style={ui.label}>อุณหภูมิสูงสุด (°C)
              <input name="max_temp" type="number" step="0.1" required placeholder="8" style={ui.input} />
            </label>
            <label style={ui.label}>รายละเอียด
              <input name="description" style={ui.input} />
            </label>
            <button type="submit" style={ui.primaryBtn}>บันทึก</button>
          </form>
        </div>
      )}

      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>รายการทั้งหมด ({types?.length || 0})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>รหัส</th>
                <th style={ui.th}>ชื่อวัคซีน</th>
                <th style={ui.th}>ช่วงอุณหภูมิ</th>
                <th style={ui.th}>รายละเอียด</th>
                {canEdit && <th style={ui.th}></th>}
              </tr>
            </thead>
            <tbody>
              {(types || []).map((t) => (
                <tr key={t.id}>
                  <td style={ui.td}><strong>{t.code}</strong></td>
                  <td style={ui.td}>{t.name}</td>
                  <td style={ui.td}>{t.min_temp} – {t.max_temp} °C</td>
                  <td style={ui.td}>{t.description || '-'}</td>
                  {canEdit && (
                    <td style={{ ...ui.td, textAlign: 'right' }}>
                      <form action={deleteVaccineType}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" style={ui.dangerBtn}>ลบ</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!types || types.length === 0) && (
                <tr><td colSpan={5} style={ui.empty}>ยังไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}