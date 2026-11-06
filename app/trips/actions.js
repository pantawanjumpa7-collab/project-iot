'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

const STATUSES = ['planned', 'in_transit', 'delivered', 'cancelled']

function fail(message) {
  redirect('/trips?error=' + encodeURIComponent(message))
}

function text(formData, key) {
  return String(formData.get(key) || '').trim()
}

// แปลงเวลาจากช่อง datetime-local (เวลาไทย) เป็นรูปแบบที่ฐานข้อมูลเก็บ
function toBangkokISO(value) {
  if (!value) return null
  const d = new Date(value + ':00+07:00')
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// สร้างรหัสเที่ยวอัตโนมัติ เช่น TR-261105-210530
function makeTripCode() {
  const s = new Date(Date.now() + 7 * 3600 * 1000).toISOString()
  return 'TR-' + s.slice(2, 10).replace(/-/g, '') + '-' + s.slice(11, 19).replace(/:/g, '')
}

export async function createTrip(formData) {
  const tripCode = text(formData, 'trip_code') || makeTripCode()
  const boxId = text(formData, 'box_id')
  const vaccineTypeId = text(formData, 'vaccine_type_id')
  const staffId = text(formData, 'staff_id') || null
  const driverId = text(formData, 'driver_id')
  const origin = text(formData, 'origin')
  const destination = text(formData, 'destination')
  const plannedStart = toBangkokISO(text(formData, 'planned_start'))
  const note = text(formData, 'note') || null

  if (!boxId || !vaccineTypeId || !driverId || !origin || !destination) {
    fail('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบ')
  }

  const supabase = await createClient()

  // ตรวจว่าคนที่เลือกเป็นคนขับจริง
  const { data: driver } = await supabase
    .from('profiles').select('role, is_active').eq('id', driverId).single()
  if (!driver || driver.role !== 'driver' || !driver.is_active) {
    fail('ผู้ที่เลือกไม่ใช่คนขับ หรือบัญชีถูกปิดใช้งาน')
  }

  const { error } = await supabase.from('trips').insert({
    trip_code: tripCode,
    box_id: boxId,
    vaccine_type_id: vaccineTypeId,
    staff_id: staffId,
    driver_id: driverId,
    origin,
    destination,
    planned_start: plannedStart,
    note,
  })

  if (error) {
    fail(error.code === '23505' ? 'รหัสเที่ยวขนส่งนี้มีอยู่แล้ว' : 'บันทึกไม่สำเร็จ: ' + error.message)
  }

  revalidatePath('/trips')
  redirect('/trips')
}

export async function updateTripStatus(formData) {
  const id = text(formData, 'id')
  const status = text(formData, 'status')
  if (!STATUSES.includes(status)) fail('สถานะไม่ถูกต้อง')

  const supabase = await createClient()
  const { data: trip } = await supabase
    .from('trips').select('id, box_id, started_at, delivered_at').eq('id', id).single()
  if (!trip) fail('ไม่พบเที่ยวขนส่ง')

  const now = new Date().toISOString()
  const patch = { status }
  if (status === 'in_transit' && !trip.started_at) patch.started_at = now
  if (status === 'delivered' && !trip.delivered_at) patch.delivered_at = now

  const { data, error } = await supabase.from('trips').update(patch).eq('id', id).select('id')
  if (error) fail('อัปเดตไม่สำเร็จ: ' + error.message)
  if (!data || data.length === 0) fail('คุณไม่มีสิทธิ์แก้ไขเที่ยวขนส่งนี้')

  // อัปเดตสถานะกล่องให้ตรงกับเที่ยวขนส่ง
  let boxStatus = null
  if (status === 'in_transit') boxStatus = 'in_transit'
  if (status === 'delivered' || status === 'cancelled') boxStatus = 'available'
  if (boxStatus) {
    await supabase.from('vaccine_boxes').update({ status: boxStatus }).eq('id', trip.box_id)
  }

  revalidatePath('/trips')
  revalidatePath('/boxes')
  redirect('/trips')
}

export async function deleteTrip(formData) {
  const id = text(formData, 'id')
  const supabase = await createClient()
  const { data, error } = await supabase.from('trips').delete().eq('id', id).select('id')

  if (error) fail('ลบไม่สำเร็จ: ' + error.message)
  if (!data || data.length === 0) fail('คุณไม่มีสิทธิ์ลบเที่ยวขนส่งนี้')

  revalidatePath('/trips')
  redirect('/trips')
}

export async function driverUpdateTrip(formData) {
  const id = text(formData, 'id')
  const action = text(formData, 'action')

  const supabase = await createClient()
  const { error } = await supabase.rpc('driver_update_trip', {
    p_trip_id: id,
    p_action: action,
  })

  if (error) fail(error.message)

  revalidatePath('/trips')
  revalidatePath('/boxes')
  redirect('/trips')
}