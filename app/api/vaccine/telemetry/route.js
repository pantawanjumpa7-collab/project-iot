
import { NextResponse } from "next/server";
import {
  isThingsBoardConfigured,
  tbFetch,
} from "@/lib/thingsboard";
import { getDemoTelemetry } from "@/lib/demo-data";

export async function GET() {
  // หากยังไม่ได้ตั้งค่า ให้ใช้ข้อมูลตัวอย่าง
  if (!isThingsBoardConfigured()) {
    return NextResponse.json(getDemoTelemetry());
  }

  try {
    const deviceId = process.env.TB_DEVICE_ID;

    const keys = [
      "temperature",
      "humidity",
      "latitude",
      "longitude",
    ].join(",");

    const query = new URLSearchParams({ keys });

    const data = await tbFetch(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?${query}`
    );

    function readValue(key) {
      const item = data[key]?.[0];

      return item
        ? {
            value: Number(item.value),
            ts: Number(item.ts),
          }
        : null;
    }

    const temp = readValue("temperature");
    const humid = readValue("humidity");
    const lat = readValue("latitude");
    const lon = readValue("longitude");

    const timestamps = [
      temp?.ts,
      humid?.ts,
      lat?.ts,
      lon?.ts,
    ].filter(Number.isFinite);

    return NextResponse.json({
      mode: "live",
      deviceName: deviceId,
      temperature: temp?.value ?? null,
      humidity: humid?.value ?? null,
      latitude: lat?.value ?? null,
      longitude: lon?.value ?? null,
      temperatureTs: temp?.ts ?? null,
      humidityTs: humid?.ts ?? null,
      lastSeen: timestamps.length
        ? Math.max(...timestamps)
        : null,
      lowerLimit: 2,
      upperLimit: 8,
    });
  } catch (error) {
    console.error("Telemetry error:", error.message);

    return NextResponse.json(
      { error: "อ่านข้อมูล ThingsBoard ไม่สำเร็จ" },
      { status: 502 }
    );
  }
}