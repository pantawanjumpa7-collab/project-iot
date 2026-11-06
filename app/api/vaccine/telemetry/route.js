import { NextResponse } from "next/server";
import { isThingsBoardConfigured, tbFetch } from "@/lib/thingsboard";
import { getDemoTelemetry } from "@/lib/demo-data";
import { getBoxContext, contextMeta } from "@/lib/box-context";

export async function GET(request) {
  const boxId = new URL(request.url).searchParams.get("box") || "";

  const ctx = await getBoxContext(boxId);
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const meta = contextMeta(ctx);

  if (!isThingsBoardConfigured()) {
    return NextResponse.json({ ...getDemoTelemetry(), ...meta });
  }

  if (!ctx.deviceId) {
    return NextResponse.json({
      mode: "no-device",
      deviceName: ctx.box?.box_code || "-",
      temperature: null,
      humidity: null,
      latitude: null,
      longitude: null,
      lastSeen: null,
      ...meta,
    });
  }

  try {
    const keys = ["temperature", "humidity", "latitude", "longitude"].join(",");
    const query = new URLSearchParams({ keys });

    const data = await tbFetch(
      `/api/plugins/telemetry/DEVICE/${ctx.deviceId}/values/timeseries?${query}`
    );

    function readValue(key) {
      const item = data[key]?.[0];
      return item ? { value: Number(item.value), ts: Number(item.ts) } : null;
    }

    const temp = readValue("temperature");
    const humid = readValue("humidity");
    const lat = readValue("latitude");
    const lon = readValue("longitude");

    const timestamps = [temp?.ts, humid?.ts, lat?.ts, lon?.ts].filter(Number.isFinite);

    return NextResponse.json({
      mode: "live",
      deviceName: ctx.box?.box_code || ctx.deviceId,
      temperature: temp?.value ?? null,
      humidity: humid?.value ?? null,
      latitude: lat?.value ?? null,
      longitude: lon?.value ?? null,
      temperatureTs: temp?.ts ?? null,
      humidityTs: humid?.ts ?? null,
      gpsTs: lat?.ts ?? null,
      lastSeen: timestamps.length ? Math.max(...timestamps) : null,
      ...meta,
    });
  } catch (error) {
    console.error("Telemetry error:", error.message);
    return NextResponse.json(
      { error: "อ่านข้อมูล ThingsBoard ไม่สำเร็จ" },
      { status: 502 }
    );
  }
}