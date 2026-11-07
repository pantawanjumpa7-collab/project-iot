// ส่งข้อความแจ้งเตือนผ่าน LINE Official Account (Messaging API)
// ใช้แบบ broadcast = ส่งถึงทุกคนที่แอดเพื่อน OA

export function isLineConfigured() {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
}

export async function sendLineBroadcast(text) {
  if (!isLineConfigured()) {
    return { ok: false, reason: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [{ type: "text", text: String(text).slice(0, 5000) }],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("LINE error:", response.status, body);
      return { ok: false, reason: `LINE ตอบกลับ ${response.status}: ${body.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (error) {
    console.error("LINE error:", error.message);
    return { ok: false, reason: error.message };
  }
}

export function formatThaiTime(date = new Date()) {
  return new Date(date).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });
}