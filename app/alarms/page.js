import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { fetchTbAlarms } from '../../lib/tb-alarms'
import { recordTbAlarm, reportIncident, resolveIncident } from './actions'
import { INCIDENT_TYPES, typeLabel } from './labels'
import * as ui from '../components/formStyles'

const okBox = {
  background: '#dcfce7',
  color: '#166534',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
  marginBottom: 16,
}

const textarea = { ...ui.input, minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function Badge({ color, bg, children }) {
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export default function AlarmsPage({ searchParams }) {
  return (
    <div>
      <h1 style={ui.title}>การแจ้งเตือนและบันทึกเหตุการณ์</h1>
      <p style={ui.subtitle}>
        ตรวจสอบ Alarm จาก ThingsBoard บันทึกเหตุการณ์ระหว่างขนส่ง และบันทึกวิธีการจัดการ
      </p>
      <Suspense fallback={<p>กำลังโหลด...</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Content({ searchParams }) {
  await connection()
  const { error, ok, box: boxFilter = '' } = await searchParams
  const supabase = await createClient()

  const { data: role } = await supabase.rpc('my_role')
  const isManager = role === 'admin' || role === 'staff'

  let incidentsQuery = supabase
    .from('incidents')
    .select(`
      *,
      box:vaccine_boxes(box_code),
      trip:trips(trip_code),
      reporter:profiles!incidents_reported_by_fkey(full_name),
      resolver:profiles!incidents_resolved_by_fkey(full_name)
    `)
    .order('occurred_at', { ascending: false })
    .limit(100)

  if (boxFilter) incidentsQuery = incidentsQuery.eq('box_id', boxFilter)

  const [{ data: boxes }, { data: activeTrips }, { data: incidents, error: incidentsError }] =
    await Promise.all([
      supabase.from('vaccine_boxes').select('id, box_code, tb_device_id').order('box_code'),
      supabase
        .from('trips')
        .select('id, trip_code, status, box:vaccine_boxes(box_code)')
        .in('status', ['planned', 'in_transit'])
        .order('created_at', { ascending: false }),
      incidentsQuery,
    ])

  // Alarm จาก ThingsBoard (เฉพาะ Admin / พนักงาน)
  let tbAlarms = []
  let tbMode = ''
  let tbError = ''
  const recorded = new Map()

  if (isManager) {
    const selectedBox = (boxes || []).find((b) => b.id === boxFilter)
    const deviceId = boxFilter ? selectedBox?.tb_device_id : null

    if (!boxFilter || deviceId) {
      try {
        const result = await fetchTbAlarms(deviceId)
        tbAlarms = result.data
        tbMode = result.mode
      } catch {
        tbError = 'อ่าน Alarm จาก ThingsBoard ไม่สำเร็จ'
      }
    }

    const ids = tbAlarms.map((a) => a.id).filter(Boolean)
    if (ids.length) {
      const { data } = await supabase
        .from('incidents')
        .select('tb_alarm_id, status, action_taken')
        .in('tb_alarm_id', ids)
      for (const r of data || []) recorded.set(r.tb_alarm_id, r)
    }
  }

  const boxByDevice = new Map((boxes || []).filter((b) => b.tb_device_id).map((b) => [b.tb_device_id, b]))

  return (
    <>
      {error && <div style={ui.errorBox}>{error}</div>}
      {ok && <div style={okBox}>{ok}</div>}
      {incidentsError && (
        <div style={ui.errorBox}>โหลดบันทึกเหตุการณ์ไม่สำเร็จ: {incidentsError.message}</div>
      )}

      {/* ตัวกรองกล่อง */}
      {isManager && (
        <form method="get" style={{ ...ui.card, display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap', padding: 16 }}>
          <label style={{ ...ui.label, minWidth: 220 }}>แสดงเฉพาะกล่อง
            <select key={boxFilter} name="box" defaultValue={boxFilter} style={ui.input}>
              <option value="">ทุกกล่อง</option>
              {(boxes || []).map((b) => (
                <option key={b.id} value={b.id}>{b.box_code}</option>
              ))}
            </select>
          </label>
          <button type="submit" style={ui.smallBtn}>กรอง</button>
        </form>
      )}

      {/* ส่วนที่ 1: Alarm จาก ThingsBoard */}
      {isManager && (
        <div style={ui.card}>
          <h2 style={ui.sectionTitle}>
            Alarm จาก ThingsBoard {tbMode === 'demo' ? '(ข้อมูลตัวอย่าง)' : ''}
          </h2>
          {tbError && <div style={ui.errorBox}>{tbError}</div>}

          <div style={{ overflowX: 'auto' }}>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th style={ui.th}>เวลา</th>
                  <th style={ui.th}>กล่อง</th>
                  <th style={ui.th}>ประเภท</th>
                  <th style={ui.th}>ระดับ</th>
                  <th style={ui.th}>สถานะใน ThingsBoard</th>
                  <th style={ui.th}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {tbAlarms.map((a) => {
                  const rec = recorded.get(a.id)
                  const box = boxByDevice.get(a.deviceId)
                  return (
                    <tr key={a.id}>
                      <td style={ui.td}>{formatTime(a.createdTime)}</td>
                      <td style={ui.td}>{box?.box_code || '-'}</td>
                      <td style={ui.td}>
                        {typeLabel(a.type)}
                        {a.message && <div style={{ fontSize: 12, color: '#64748b' }}>{a.message}</div>}
                      </td>
                      <td style={ui.td}>{a.severity}</td>
                      <td style={ui.td}>
                        {a.status === 'ACTIVE'
                          ? <Badge bg="#fee2e2" color="#991b1b">ACTIVE</Badge>
                          : <Badge bg="#dcfce7" color="#166534">CLEARED</Badge>}
                      </td>
                      <td style={{ ...ui.td, minWidth: 260 }}>
                        {rec && (
                          <div style={{ marginBottom: 6 }}>
                            {rec.status === 'resolved'
                              ? <Badge bg="#dcfce7" color="#166534">จัดการแล้ว</Badge>
                              : <Badge bg="#fef3c7" color="#92400e">กำลังดำเนินการ</Badge>}
                            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{rec.action_taken}</div>
                          </div>
                        )}
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#0f766e', fontSize: 13 }}>
                            {rec ? 'แก้ไขการจัดการ' : 'บันทึกการจัดการ'}
                          </summary>
                          <form action={recordTbAlarm} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            <input type="hidden" name="tb_alarm_id" value={a.id} />
                            <input type="hidden" name="device_id" value={a.deviceId || ''} />
                            <input type="hidden" name="alarm_type" value={a.type} />
                            <input type="hidden" name="severity" value={a.severity} />
                            <input type="hidden" name="occurred_at" value={a.createdTime || ''} />
                            <input type="hidden" name="description" value={a.message || ''} />
                            <input type="hidden" name="box_filter" value={boxFilter} />
                            <textarea
                              name="action_taken"
                              required
                              defaultValue={rec?.action_taken || ''}
                              placeholder="เช่น โทรแจ้งคนขับให้ตรวจฝากล่อง เติมเจลเย็น อุณหภูมิกลับมาปกติ"
                              style={textarea}
                            />
                            <select name="resolved" defaultValue={rec?.status === 'resolved' ? 'true' : 'false'} style={ui.input}>
                              <option value="false">กำลังดำเนินการ</option>
                              <option value="true">จัดการเสร็จแล้ว</option>
                            </select>
                            <button type="submit" style={ui.primaryBtn}>บันทึก</button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  )
                })}
                {tbAlarms.length === 0 && !tbError && (
                  <tr><td colSpan={6} style={ui.empty}>ไม่มี Alarm จาก ThingsBoard</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ส่วนที่ 2: แจ้งเหตุการณ์ด้วยตนเอง */}
      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>แจ้งเหตุการณ์ระหว่างขนส่ง</h2>
        {(activeTrips || []).length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>
            {isManager ? 'ยังไม่มีเที่ยวขนส่งที่กำลังดำเนินการ' : 'คุณยังไม่มีเที่ยวขนส่งที่กำลังดำเนินการ'}
          </p>
        ) : (
          <form action={reportIncident} style={ui.grid}>
            <input type="hidden" name="box_filter" value={boxFilter} />
            <label style={ui.label}>เที่ยวขนส่ง *
              <select name="trip_id" required defaultValue="" style={ui.input}>
                <option value="" disabled>เลือกเที่ยว</option>
                {(activeTrips || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trip_code} ({t.box?.box_code || '-'})
                  </option>
                ))}
              </select>
            </label>
            <label style={ui.label}>ประเภทเหตุการณ์ *
              <select name="alarm_type" required defaultValue="" style={ui.input}>
                <option value="" disabled>เลือกประเภท</option>
                {Object.entries(INCIDENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label style={ui.label}>อุณหภูมิขณะนั้น (°C)
              <input name="temperature" type="number" step="0.1" style={ui.input} />
            </label>
            <label style={ui.label}>รายละเอียด
              <input name="description" placeholder="เกิดอะไรขึ้น" style={ui.input} />
            </label>
            <label style={ui.label}>สิ่งที่ทำไปแล้ว
              <input name="action_taken" placeholder="เช่น ปิดฝากล่องให้สนิทแล้ว" style={ui.input} />
            </label>
            <button type="submit" style={ui.primaryBtn}>บันทึกเหตุการณ์</button>
          </form>
        )}
      </div>

      {/* ส่วนที่ 3: ประวัติเหตุการณ์และการจัดการ */}
      <div style={ui.card}>
        <h2 style={ui.sectionTitle}>
          ประวัติเหตุการณ์และการจัดการ ({incidents?.length || 0})
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>เวลา</th>
                <th style={ui.th}>กล่อง / เที่ยว</th>
                <th style={ui.th}>เหตุการณ์</th>
                <th style={ui.th}>การดำเนินการ</th>
                <th style={ui.th}>ผู้บันทึก</th>
                <th style={ui.th}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {(incidents || []).map((i) => (
                <tr key={i.id}>
                  <td style={ui.td}>{formatTime(i.occurred_at)}</td>
                  <td style={ui.td}>
                    <div><strong>{i.box?.box_code || '-'}</strong></div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{i.trip?.trip_code || 'ไม่อยู่ในเที่ยวขนส่ง'}</div>
                  </td>
                  <td style={ui.td}>
                    <div>{typeLabel(i.alarm_type)}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {i.tb_alarm_id ? 'จาก ThingsBoard' : 'แจ้งด้วยตนเอง'}
                      {i.temperature != null ? ` · ${i.temperature} °C` : ''}
                    </div>
                    {i.description && <div style={{ fontSize: 12, color: '#475569' }}>{i.description}</div>}
                  </td>
                  <td style={{ ...ui.td, maxWidth: 260 }}>{i.action_taken || '-'}</td>
                  <td style={{ ...ui.td, fontSize: 13 }}>
                    <div>{i.reporter?.full_name || '-'}</div>
                    {i.resolver && (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        ปิดโดย {i.resolver.full_name} · {formatTime(i.resolved_at)}
                      </div>
                    )}
                  </td>
                  <td style={{ ...ui.td, minWidth: 180 }}>
                    {i.status === 'resolved'
                      ? <Badge bg="#dcfce7" color="#166534">จัดการแล้ว</Badge>
                      : <Badge bg="#fef3c7" color="#92400e">รอดำเนินการ</Badge>}
                    {isManager && i.status !== 'resolved' && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: 'pointer', color: '#0f766e', fontSize: 13 }}>ปิดเหตุการณ์</summary>
                        <form action={resolveIncident} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="box_filter" value={boxFilter} />
                          <textarea
                            name="action_taken"
                            required
                            defaultValue={i.action_taken || ''}
                            placeholder="สรุปการดำเนินการ"
                            style={textarea}
                          />
                          <button type="submit" style={ui.primaryBtn}>ยืนยันปิดเหตุการณ์</button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {(!incidents || incidents.length === 0) && (
                <tr><td colSpan={6} style={ui.empty}>ยังไม่มีบันทึกเหตุการณ์</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}