import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("my_role");

  if (!role) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  if (role === "driver") {
    const { data: trips } = await supabase
      .from("trips")
      .select("box:vaccine_boxes(id, box_code, name, tb_device_id, status)")
      .in("status", ["planned", "in_transit"]);

    const map = new Map();
    for (const t of trips || []) {
      if (t.box) map.set(t.box.id, t.box);
    }

    const boxes = [...map.values()].sort((a, b) =>
      a.box_code.localeCompare(b.box_code)
    );

    return NextResponse.json({ role, boxes });
  }

  const { data: boxes, error } = await supabase
    .from("vaccine_boxes")
    .select("id, box_code, name, tb_device_id, status")
    .order("box_code");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ role, boxes: boxes || [] });
}
