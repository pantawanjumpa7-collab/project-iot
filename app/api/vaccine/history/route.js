
import { NextResponse } from "next/server";
import {
  isThingsBoardConfigured,
  tbFetch,
} from "@/lib/thingsboard";
import { getDemoHistory } from "@/lib/demo-data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") || 1);

  if (![1, 7, 30].includes(days)) {
    return NextResponse.json(
      { error: "Invalid period" },
      { status: 400 }
    );
  }

  if (!isThingsBoardConfigured()) {
    return NextResponse.json({
      mode: "demo",
      days,
      data: getDemoHistory(),
    });
  }

  try {
    const now = Date.now();
    const start = now - days * 24 * 60 * 60 * 1000;

    // ปรับความละเอียดตามช่วงเวลาที่เลือก
    const interval = {
        1: 300000,     // 24 ชั่วโมง: เฉลี่ยทุก 5 นาที
        7: 3600000,    // 7 วัน: เฉลี่ยทุก 1 ชั่วโมง
        30: 10800000,  // 30 วัน: เฉลี่ยทุก 3 ชั่วโมง
    }[days];

    const deviceId = process.env.TB_DEVICE_ID;

    
    const query = new URLSearchParams({
        keys: "temperature,humidity",
        startTs: String(start),
        endTs: String(now),
        interval: String(interval),
        intervalType: "MILLISECONDS",
        agg: "AVG",
        orderBy: "ASC",
        limit: "1000",});

    const result = await tbFetch(
      `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?${query}`
    );

    const points = new Map();

    for (const key of ["temperature", "humidity"]) {
      for (const item of result[key] || []) {
        const ts = Number(item.ts);

        if (!points.has(ts)) {
          points.set(ts, { ts });
        }

        points.get(ts)[key] = Number(item.value);
      }
    }

    const data = [...points.values()].sort(
      (a, b) => a.ts - b.ts
    );

    return NextResponse.json({
      mode: "live",
      days,
      data,
    });
  } catch (error) {
    console.error("History error:", error.message);

    return NextResponse.json(
      { error: "อ่านประวัติ ThingsBoard ไม่สำเร็จ" },
      { status: 502 }
    );
  }
}