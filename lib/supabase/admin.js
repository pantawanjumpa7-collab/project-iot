import { createClient } from "@supabase/supabase-js";

// ใช้เฉพาะในฝั่งเซิร์ฟเวอร์เท่านั้น (server actions)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY ใน .env.local");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}