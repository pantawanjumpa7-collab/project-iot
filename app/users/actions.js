'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'

const ROLES = ['admin', 'staff', 'driver']

function fail(message) {
  redirect('/users?error=' + encodeURIComponent(message))
}

function done(message) {
  revalidatePath('/users')
  redirect('/users?ok=' + encodeURIComponent(message))
}

function text(formData, key) {
  return String(formData.get(key) || '').trim()
}

// ตรวจว่าเป็น Admin จริง แล้วคืนค่า id ของตัวเอง
async function requireAdmin() {
  const supabase = await createClient()
  const { data: role } = await supabase.rpc('my_role')
  if (role !== 'admin') fail('เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการผู้ใช้ได้')

  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub
}

function getAdmin() {
  try {
    return createAdminClient()
  } catch (e) {
    fail(e.message)
  }
}

export async function createUser(formData) {
  await requireAdmin()

  const email = text(formData, 'email').toLowerCase()
  const password = String(formData.get('password') || '')
  const fullName = text(formData, 'full_name')
  const employeeCode = text(formData, 'employee_code') || null
  const phone = text(formData, 'phone') || null
  const role = text(formData, 'role')

  if (!email || !fullName) fail('กรุณากรอกอีเมลและชื่อ-นามสกุล')
  if (password.length < 6) fail('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
  if (!ROLES.includes(role)) fail('บทบาทไม่ถูกต้อง')

  const admin = getAdmin()

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) {
    fail(
      /already|registered|exists/i.test(error.message)
        ? 'อีเมลนี้มีบัญชีอยู่แล้ว'
        : 'สร้างบัญชีไม่สำเร็จ: ' + error.message
    )
  }

  // ระบบสร้าง profile ให้อัตโนมัติ (role = driver) แล้วเราอัปเดตข้อมูลที่เหลือ
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, employee_code: employeeCode, phone, role })
    .eq('id', created.user.id)

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    fail(
      profileError.code === '23505'
        ? 'รหัสพนักงานนี้ถูกใช้แล้ว'
        : 'บันทึกข้อมูลไม่สำเร็จ: ' + profileError.message
    )
  }

  done('สร้างบัญชี ' + email + ' เรียบร้อย')
}

export async function updateUser(formData) {
  const myId = await requireAdmin()

  const id = text(formData, 'id')
  const role = text(formData, 'role')
  const isActive = text(formData, 'is_active') === 'true'
  const fullName = text(formData, 'full_name')
  const employeeCode = text(formData, 'employee_code') || null
  const phone = text(formData, 'phone') || null

  if (!ROLES.includes(role)) fail('บทบาทไม่ถูกต้อง')
  if (!fullName) fail('ชื่อ-นามสกุลห้ามว่าง')
  if (id === myId && (role !== 'admin' || !isActive)) {
    fail('ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตัวเองได้')
  }

  const admin = getAdmin()

  const { error } = await admin
    .from('profiles')
    .update({
      role,
      is_active: isActive,
      full_name: fullName,
      employee_code: employeeCode,
      phone,
    })
    .eq('id', id)

  if (error) {
    fail(error.code === '23505' ? 'รหัสพนักงานนี้ถูกใช้แล้ว' : 'บันทึกไม่สำเร็จ: ' + error.message)
  }

  done('บันทึกข้อมูลผู้ใช้เรียบร้อย')
}

export async function resetPassword(formData) {
  await requireAdmin()

  const id = text(formData, 'id')
  const password = String(formData.get('password') || '')

  if (password.length < 6) fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')

  const admin = getAdmin()
  const { error } = await admin.auth.admin.updateUserById(id, { password })

  if (error) fail('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message)

  done('เปลี่ยนรหัสผ่านเรียบร้อย')
}