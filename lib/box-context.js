import { createClient } from "./supabase/server";

const DEFAULT_LOWER = 2;
const DEFAULT_UPPER = 8;

const BOX_FIELDS = "id, box_code, name, tb_device_id, status";

const TRIP_FIELDS = `
  id, trip_code, status, origin, destination, planned_start, started_at,
  vaccine:vaccine_types(code, name, min_temp, max_temp),
  staff:profiles!trips_staff_id_fkey(full_name, employee_code, phone),
  driver:profiles!trips_driver_id_fkey(full_name, employee_code, phone)
`;

export async function getRole() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_role");
  return data || null;
}

export async function getBoxContext(boxId) {
  const supabase = await createClient();
  const { data: role } = await supabase.rpc("my_role");

  if (!role) {
    return { error: "กรุณาเข้าสู่ระบบ", status: 401 };
  }

  let box = null;

  if (boxId) {
    const { data } = await supabase
      .from("vaccine_boxes")
      .select(BOX_FIELDS)
      .eq("id", boxId)
      .maybeSingle();

    if (!data) {
      return { error: "ไม่พบกล่องวัคซีน", status: 404 };
    }
    box = data;
  } else if (process.env.TB_DEVICE_ID) {
    const { data } = await supabase
      .from("vaccine_boxes")
      .select(BOX_FIELDS)
      .eq("tb_device_id", process.env.TB_DEVICE_ID)
      .maybeSingle();
    box = data || null;
  }

  let trip = null;
  if (box) {
    const { data: trips } = await supabase
      .from("trips")
      .select(TRIP_FIELDS)
      .eq("box_id", box.id)
      .in("status", ["in_transit", "planned"])
      .order("created_at", { ascending: false });

    trip =
      trips?.find((t) => t.status === "in_transit") ||
      trips?.[0] ||
      null;
  }

  if (role === "driver" && !trip) {
    return { error: "คุณไม่มีเที่ยวขนส่งที่ใช้กล่องนี้", status: 403 };
  }

  const deviceId = box
    ? box.tb_device_id || null
    : process.env.TB_DEVICE_ID || null;

  const lowerLimit = trip?.vaccine ? Number(trip.vaccine.min_temp) : DEFAULT_LOWER;
  const upperLimit = trip?.vaccine ? Number(trip.vaccine.max_temp) : DEFAULT_UPPER;

  return { role, box, trip, deviceId, lowerLimit, upperLimit };
}

export function contextMeta(ctx) {
  return {
    box: ctx.box,
    trip: ctx.trip,
    deviceId: ctx.deviceId,
    lowerLimit: ctx.lowerLimit,
    upperLimit: ctx.upperLimit,
    limitSource: ctx.trip?.vaccine ? "vaccine" : "default",
  };
}