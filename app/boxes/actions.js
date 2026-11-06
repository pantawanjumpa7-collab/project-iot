'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

const STATUSES = ['available', 'in_transit', 'maintenance']

function fail(message) {
  redirect('/boxes?error=' + encodeURIComponent(message))
}

export async function createBox(formData) {
  const boxCode = String(formData.get('box_code') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const tbDeviceId = String(formData.get('tb_device_id') || '').trim() || null
  const note = String(formData.get('note') || '').trim() || null

  if (!boxCode) fail('กรุณากรอกรหัสกล่อง')

  const supabase = await createClient()
  const { error } = await supabase
    .from('vaccine_boxes')
    .insert({ box_code: boxCode, name, tb_device_id: tbDeviceId, note })

  if (error) {
    fail(error.code === '23505' ? 'รหัสกล่องหรือ Device ID นี้ถูกใช้แล้ว' : 'บันทึกไม่สำเร็จ: ' + error.message)
  }

  revalidatePath('/boxes')
  redirect('/boxes')
}

export async function updateBoxStatus(formData) {
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  if (!STATUSES.includes(status)) fail('สถานะไม่ถูกต้อง')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vaccine_boxes').update({ status }).eq('id', id).select('id')

  if (error) fail('อัปเดตไม่สำเร็จ: ' + error.message)
  if (!data || data.length === 0) fail('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้')

  revalidatePath('/boxes')
  redirect('/boxes')
}

export async function deleteBox(formData) {
  const id = String(formData.get('id') || '')
  const supabase = await createClient()
  const { data, error } = await supabase.from('vaccine_boxes').delete().eq('id', id).select('id')

  if (error) {
    fail(error.code === '23503' ? 'ลบไม่ได้ เพราะกล่องนี้มีประวัติเที่ยวขนส่งอยู่' : 'ลบไม่สำเร็จ: ' + error.message)
  }
  if (!data || data.length === 0) fail('คุณไม่มีสิทธิ์ลบข้อมูลนี้')

  revalidatePath('/boxes')
  redirect('/boxes')
}