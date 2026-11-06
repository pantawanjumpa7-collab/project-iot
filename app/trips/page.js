import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { createTrip, updateTripStatus, deleteTrip, driverUpdateTrip } from './actions'
import * as ui from '../components/formStyles'

const statusInfo = {
  planned: { label: 'วางแผนแล้ว', bg: '#f1f5f9', color: '#334155' },
  in_transit: { label: 'กำลังขนส่ง', bg: '#dbeafe', color: '#1e40af' },
  delivered: { label: 'ส่งถึงแล้ว', bg: '#dcfce7', color: '#166534' },
  cancelled: { label: 'ยกเลิก', bg: '#fee2e2', color: '#991b1b' },
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function Person({ p }) {
  if (!p) return <span style={{ color: '#94a3b8' }}>-</span>
  return (
    <div>
      <div>{p.full_name || '-'} {p.employee_code ? `(${p.employee_code})` : ''}</div>
      {p.phone && (
        <a href={`tel:${p.phone}`} style={{ fontSize: 12, color: '#0f766e', display: 'block' }}>
          ☎ {p.phone}
        </a>
      )}
    </div>
  )
}

export default function TripsPage({ searchParams }) {
  return (
    <div>
      <h1 style={ui.title}>เที่ยวขนส่ง</h1>
      <p style={ui.subtitle}>มอบหมายกล่องวัคซีน พนักงานผู้ดูแล และคนขับในแต่ละเที่ยว</p>
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

  const { data: role } = await supabase.rpc('my_role')
  const canEdit = role === 'admin' || role === 'staff'
  const isDriver = role === 'driver'

  const tripsQuery = supabase
    .from('trips')
    .select(`
      *,
      box:vaccine_boxes(box_code, name),
      vaccine:vaccine_types(code, name, min_temp, max_temp),
      staff:profiles!trips_staff_id_fkey(full_name, employee_code, phone),
      driver:profiles!trips_driver_id_fkey(full_name, employee_code, phone)
    `)
    .order('created_at', { ascending: false })

  const [{ data: trips, error: tripsError }, boxesRes, typesRes, peopleRes] = await Promise.all([
    tripsQuery,
    canEdit ? supabase.from('vaccine_boxes').select('id, box_code, name').eq('status', 'available').order('box_code') : { data: [] },
    canEdit ? supabase.from('vaccine_types').select('id, code, name, min_temp, max_temp').order('code') : { data: [] },
    canEdit ? supabase.from('profiles').select('id, full_name, employee_code, role').eq('is_active', true).order('employee_code') : { data: [] },
  ])

  const boxes = boxesRes.data || []
  const types = typesRes.data || []
  const staffList = (peopleRes.data || []).filter((p) => p.role === 'staff' || p.role === 'admin')
  const driverList = (peopleRes.data || []).filter((p) => p.role === 'driver')

  return (
    <>
      {error && <div style={ui.errorBox}>{error}</div>}
      {tripsError && <div style={ui.errorBox}>โหลดข้อมูลไม่สำเร็จ: {tripsError.message}</div>}

      {canEdit && (
        <div style={ui.card}>
          <h2 style={ui.sectionTitle}>สร้างเที่ยวขนส่งใหม่</h2>
          {boxes.length === 0 ? (
            <p style={{ color: '#92400e', margin: 0 }}>
              ไม่มีกล่องที่สถานะ &ldquo;พร้อมใช้งาน&rdquo; กรุณาเพิ่มกล่องหรือเปลี่ยนสถานะกล่องที่หน้ากล่องวัคซีนก่อน
            </p>
          ) : (
            <form action={createTrip} style={ui.grid}>
              <label style={ui.label}>รหัสเที่ยว
                <input name="trip_code" placeholder="เว้นว่าง = สร้างอัตโนมัติ" style={ui.input} />
              </label>
              <label style={ui.label}>กล่องวัคซีน *
                <select name="box_id" required style={ui.input} defaultValue="">
                  <option value="" disabled>เลือกกล่อง</option>
                  {boxes.map((b) => (
                    <option key={b.id} value={b.id}>{b.box_code} {b.name ? `- ${b.name}` : ''}</option>
                  ))}
                </select>
              </label>
              <label style={ui.label}>ประเภทวัคซีน *
                <select name="vaccine_type_id" required style={ui.input} defaultValue="">
                  <option value="" disabled>เลือกวัคซีน</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.code} - {t.name} ({t.min_temp}–{t.max_temp} °C)</option>
                  ))}
                </select>
              </label>
              <label style={ui.label}>พนักงานผู้ดูแล
                <select name="staff_id" style={ui.input} defaultValue="">
                  <option value="">ไม่ระบุ</option>
                  {staffList.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} {p.employee_code ? `(${p.employee_code})` : ''}</option>
                  ))}
                </select>
              </label>
              <label style={ui.label}>คนขับ *
                <select name="driver_id" required style={ui.input} defaultValue="">
                  <option value="" disabled>เลือกคนขับ</option>
                  {driverList.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} {p.employee_code ? `(${p.employee_code})` : ''}</option>
                  ))}
                </select>
              </label>
              <label style={ui.label}>ต้นทาง *
                <input name="origin" required placeholder="เช่น คลังวัคซีน รพ.จังหวัด" style={ui.input} />
              </label>
              <label style={ui.label}>ปลายทาง *
                <input name="destination" required placeholder="เช่น รพ.สต. บ้านตัวอย่าง" style={ui.input} />
              </label>
              <label style={ui.label}>กำหนดออกเดินทาง
                <input name="planned_start" type="datetime-local" style={ui.input} />
              </label>
              <label style={ui.label}>หมายเหตุ
                <input name="note" style={ui.input} />
              </label>
              <button type="submit" style={ui.primaryBtn}>สร้างเที่ยวขนส่ง</button>
            </form>
          )}
        </div>
      )}

      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>
          {canEdit ? 'เที่ยวขนส่งทั้งหมด' : 'เที่ยวขนส่งของฉัน'} ({trips?.length || 0})
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>รหัสเที่ยว</th>
                <th style={ui.th}>กล่อง / วัคซีน</th>
                <th style={ui.th}>เส้นทาง</th>
                <th style={ui.th}>พนักงานผู้ดูแล</th>
                <th style={ui.th}>คนขับ</th>
                <th style={ui.th}>เวลา</th>
                <th style={ui.th}>สถานะ</th>
                {(canEdit || isDriver) && <th style={ui.th}></th>}
              </tr>
            </thead>
            <tbody>
              {(trips || []).map((t) => {
                const s = statusInfo[t.status] || statusInfo.planned
                const canDelete = t.status === 'planned' || t.status === 'cancelled'
                return (
                  <tr key={t.id}>
                    <td style={ui.td}><strong>{t.trip_code}</strong></td>
                    <td style={ui.td}>
                      <div><strong>{t.box?.box_code || '-'}</strong></div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {t.vaccine ? `${t.vaccine.name} (${t.vaccine.min_temp}–${t.vaccine.max_temp} °C)` : '-'}
                      </div>
                    </td>
                    <td style={ui.td}>
                      <div>{t.origin}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>→ {t.destination}</div>
                    </td>
                    <td style={ui.td}><Person p={t.staff} /></td>
                    <td style={ui.td}><Person p={t.driver} /></td>
                    <td style={{ ...ui.td, fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                      <div>กำหนด: {formatTime(t.planned_start)}</div>
                      <div>ออก: {formatTime(t.started_at)}</div>
                      <div>ถึง: {formatTime(t.delivered_at)}</div>
                    </td>
                    <td style={ui.td}>
                      <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </td>

                    {canEdit && (
                      <td style={{ ...ui.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <form action={updateTripStatus} style={{ display: 'flex', gap: 6 }}>
                            <input type="hidden" name="id" value={t.id} />
                            <select name="status" defaultValue={t.status} style={{ ...ui.input, width: 'auto', padding: '6px 8px' }}>
                              {Object.entries(statusInfo).map(([value, info]) => (
                                <option key={value} value={value}>{info.label}</option>
                              ))}
                            </select>
                            <button type="submit" style={ui.smallBtn}>เปลี่ยน</button>
                          </form>
                          {canDelete && (
                            <form action={deleteTrip}>
                              <input type="hidden" name="id" value={t.id} />
                              <button type="submit" style={ui.dangerBtn}>ลบ</button>
                            </form>
                          )}
                        </div>
                      </td>
                    )}

                    {isDriver && (
                      <td style={{ ...ui.td, textAlign: 'right' }}>
                        {t.status === 'planned' && (
                          <form action={driverUpdateTrip}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="action" value="start" />
                            <button type="submit" style={{ ...ui.primaryBtn, whiteSpace: 'nowrap' }}>
                              🚚 ออกเดินทาง
                            </button>
                          </form>
                        )}
                        {t.status === 'in_transit' && (
                          <form action={driverUpdateTrip}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="action" value="deliver" />
                            <button type="submit" style={{ ...ui.primaryBtn, background: '#166534', whiteSpace: 'nowrap' }}>
                              ✅ ส่งถึงแล้ว
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {(!trips || trips.length === 0) && (
                <tr><td colSpan={8} style={ui.empty}>ยังไม่มีเที่ยวขนส่ง</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}