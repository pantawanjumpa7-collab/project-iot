'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

function fail(message) {
  redirect('/vaccine-types?error=' + encodeURIComponent(message))
}

export async function createVaccineType(formData) {
  const code = String(formData.get('code') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const minTemp = Number(formData.get('min_temp'))
  const maxTemp = Number(formData.get('max_temp'))
  const description = String(formData.get('description') || '').trim() || null

  if (!code || !name) fail('กรุณากรอกรหัสและชื่อวัคซีน')
  if (!Number.isFinite(minTemp) || !Number.isFinite(maxTemp) || minTemp >= maxTemp) {
    fail('อุณหภูมิต่ำสุดต้องน้อยกว่าอุณหภูมิสูงสุด')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('vaccine_types')
    .insert({ code, name, min_temp: minTemp, max_temp: maxTemp, description })

  if (error) {
    fail(error.code === '23505' ? 'รหัสวัคซีนนี้มีอยู่แล้ว' : 'บันทึกไม่สำเร็จ: ' + error.message)
  }

  revalidatePath('/vaccine-types')
  redirect('/vaccine-types')
}

export async function deleteVaccineType(formData) {
  const id = String(formData.get('id') || '')
  const supabase = await createClient()
  const { data, error } = await supabase.from('vaccine_types').delete().eq('id', id).select('id')

  if (error) {
    fail(error.code === '23503' ? 'ลบไม่ได้ เพราะมีเที่ยวขนส่งใช้วัคซีนประเภทนี้อยู่' : 'ลบไม่สำเร็จ: ' + error.message)
  }
  if (!data || data.length === 0) fail('คุณไม่มีสิทธิ์ลบข้อมูลนี้')

  revalidatePath('/vaccine-types')
  redirect('/vaccine-types')
}