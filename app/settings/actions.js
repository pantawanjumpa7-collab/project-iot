'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { sendLineBroadcast, formatThaiTime } from '../../lib/line'

export async function sendLineTest() {
  const supabase = await createClient()
  const { data: role } = await supabase.rpc('my_role')

  if (role !== 'admin' && role !== 'staff') {
    redirect('/settings?line_error=' + encodeURIComponent('เฉพาะผู้ดูแลระบบและพนักงานเท่านั้น'))
  }

  const result = await sendLineBroadcast(
    `✅ ทดสอบการแจ้งเตือน\nระบบติดตามการขนส่งวัคซีนเชื่อมต่อ LINE OA สำเร็จ\nเวลา: ${formatThaiTime()}`
  )

  if (!result.ok) {
    redirect('/settings?line_error=' + encodeURIComponent(result.reason))
  }

  redirect('/settings?line_ok=1')
}