'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { INCIDENT_TYPES } from './labels'
import { sendLineBroadcast, formatThaiTime } from '../../lib/line'

function back(params) {
  const box = params.box ? `&box=${encodeURIComponent(params.box)}` : ''
  if (params.error) redirect('/alarms?error=' + encodeURIComponent(params.error) + box)
  revalidatePath('/alarms')
  redirect('/alarms?ok=' + encodeURIComponent(params.ok) + box)
}

function text(formData, key) {
  return String(formData.get(key) || '').trim()
}

async function getUser() {
  const supabase = await createClient()
  const [{ data: role }, { data: claims }] = await Promise.all([
    supabase.rpc('my_role'),
    supabase.auth.getClaims(),
  ])
  return { supabase, role, userId: claims?.claims?.sub || null }
}

// หาเที่ยวขนส่งของกล่องนี้ ที่กำลังวิ่งอยู่ ณ เวลาที่เกิดเหตุ
async function findTripForBox(supabase, boxId, at) {
  const { data } = await supabase
    .from('trips')
    .select('id, started_at, delivered_at')
    .eq('box_id', boxId)
    .not('started_at', 'is', null)
    .lte('started_at', at.toISOString())
    .order('started_at', { ascending: false })
    .limit(5)

  const trip = (data || []).find(
    (t) => !t.delivered_at || new Date(t.delivered_at) >= at
  )
  return trip?.id || null
}

// พนักงานบันทึกการจัดการ Alarm ที่มาจาก ThingsBoard
export async function recordTbAlarm(formData) {
  const { supabase, role, userId } = await getUser()
  const boxParam = text(formData, 'box_filter')

  if (role !== 'admin' && role !== 'staff') {
    back({ error: 'เฉพาะผู้ดูแลระบบและพนักงานเท่านั้น', box: boxParam })
  }

  const tbAlarmId = text(formData, 'tb_alarm_id')
  const deviceId = text(formData, 'device_id')
  const alarmType = text(formData, 'alarm_type') || 'UNKNOWN'
  const severity = text(formData, 'severity') || null
  const occurredMs = Number(text(formData, 'occurred_at'))
  const description = text(formData, 'description') || null
  const actionTaken = text(formData, 'action_taken')
  const resolved = text(formData, 'resolved') === 'true'

  if (!tbAlarmId) back({ error: 'ไม่พบรหัส Alarm', box: boxParam })
  if (!actionTaken) back({ error: 'กรุณากรอกการดำเนินการ', box: boxParam })

  const occurredAt = Number.isFinite(occurredMs) && occurredMs > 0 ? new Date(occurredMs) : new Date()

  let boxId = null
  let tripId = null
  if (deviceId) {
    const { data: box } = await supabase
      .from('vaccine_boxes').select('id').eq('tb_device_id', deviceId).maybeSingle()
    if (box) {
      boxId = box.id
      tripId = await findTripForBox(supabase, box.id, occurredAt)
    }
  }

  const { error } = await supabase.from('incidents').upsert(
    {
      tb_alarm_id: tbAlarmId,
      box_id: boxId,
      trip_id: tripId,
      occurred_at: occurredAt.toISOString(),
      alarm_type: alarmType,
      severity,
      description,
      action_taken: actionTaken,
      status: resolved ? 'resolved' : 'open',
      resolved_by: resolved ? userId : null,
      resolved_at: resolved ? new Date().toISOString() : null,
    },
    { onConflict: 'tb_alarm_id' }
  )

  if (error) back({ error: 'บันทึกไม่สำเร็จ: ' + error.message, box: boxParam })

  back({ ok: 'บันทึกการจัดการ Alarm เรียบร้อย', box: boxParam })
}

// แจ้งเหตุการณ์ด้วยตนเอง (พนักงาน หรือคนขับในเที่ยวของตัวเอง) + ส่ง LINE
export async function reportIncident(formData) {
  const { supabase, role, userId } = await getUser()
  const boxParam = text(formData, 'box_filter')

  if (!role) back({ error: 'กรุณาเข้าสู่ระบบ', box: boxParam })

  const tripId = text(formData, 'trip_id')
  const alarmType = text(formData, 'alarm_type')
  const tempText = text(formData, 'temperature')
  const description = text(formData, 'description') || null
  const actionTaken = text(formData, 'action_taken') || null

  if (!tripId) back({ error: 'กรุณาเลือกเที่ยวขนส่ง', box: boxParam })
  if (!INCIDENT_TYPES[alarmType]) back({ error: 'กรุณาเลือกประเภทเหตุการณ์', box: boxParam })

  const temperature = tempText === '' ? null : Number(tempText)
  if (temperature !== null && !Number.isFinite(temperature)) {
    back({ error: 'อุณหภูมิต้องเป็นตัวเลข', box: boxParam })
  }

  // คนขับจะเห็นเฉพาะเที่ยวของตัวเอง ถ้าไม่พบแปลว่าไม่มีสิทธิ์
  const { data: trip } = await supabase
    .from('trips')
    .select('id, box_id, trip_code, origin, destination, box:vaccine_boxes(box_code)')
    .eq('id', tripId)
    .maybeSingle()
  if (!trip) back({ error: 'ไม่พบเที่ยวขนส่ง หรือคุณไม่มีสิทธิ์', box: boxParam })

  const { error } = await supabase.from('incidents').insert({
    trip_id: trip.id,
    box_id: trip.box_id,
    alarm_type: alarmType,
    temperature,
    description,
    action_taken: actionTaken,
    status: 'open',
    reported_by: userId,
  })

  if (error) back({ error: 'บันทึกไม่สำเร็จ: ' + error.message, box: boxParam })

  // ส่งแจ้งเตือน LINE (ถ้าส่งไม่สำเร็จ เหตุการณ์ยังถูกบันทึกอยู่)
  const { data: me } = await supabase
    .from('profiles').select('full_name').eq('id', userId).maybeSingle()

  const lines = [
    '🚨 แจ้งเหตุระหว่างขนส่งวัคซีน',
    `เที่ยว: ${trip.trip_code}`,
    `กล่อง: ${trip.box?.box_code || '-'}`,
    `เส้นทาง: ${trip.origin} → ${trip.destination}`,
    `เหตุการณ์: ${INCIDENT_TYPES[alarmType]}`,
  ]
  if (temperature !== null) lines.push(`อุณหภูมิ: ${temperature} °C`)
  if (description) lines.push(`รายละเอียด: ${description}`)
  if (actionTaken) lines.push(`ดำเนินการแล้ว: ${actionTaken}`)
  lines.push(`ผู้แจ้ง: ${me?.full_name || '-'}`)
  lines.push(`เวลา: ${formatThaiTime()}`)

  const line = await sendLineBroadcast(lines.join('\n'))

  back({
    ok: line.ok
      ? 'บันทึกเหตุการณ์และส่งแจ้งเตือน LINE เรียบร้อย'
      : 'บันทึกเหตุการณ์เรียบร้อย (ส่ง LINE ไม่สำเร็จ: ' + line.reason + ')',
    box: boxParam,
  })
}

// พนักงานปิดเหตุการณ์ พร้อมบันทึกการดำเนินการ
export async function resolveIncident(formData) {
  const { supabase, role, userId } = await getUser()
  const boxParam = text(formData, 'box_filter')

  if (role !== 'admin' && role !== 'staff') {
    back({ error: 'เฉพาะผู้ดูแลระบบและพนักงานเท่านั้น', box: boxParam })
  }

  const id = text(formData, 'id')
  const actionTaken = text(formData, 'action_taken')
  if (!actionTaken) back({ error: 'กรุณากรอกการดำเนินการ', box: boxParam })

  const { data, error } = await supabase
    .from('incidents')
    .update({
      action_taken: actionTaken,
      status: 'resolved',
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')

  if (error) back({ error: 'บันทึกไม่สำเร็จ: ' + error.message, box: boxParam })
  if (!data || data.length === 0) back({ error: 'ไม่พบเหตุการณ์ หรือคุณไม่มีสิทธิ์', box: boxParam })

  back({ ok: 'ปิดเหตุการณ์เรียบร้อย', box: boxParam })
}