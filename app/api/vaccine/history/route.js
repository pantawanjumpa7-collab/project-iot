import { NextResponse } from "next/server";
import { isThingsBoardConfigured, tbFetch } from "@/lib/thingsboard";
import { getDemoHistory } from "@/lib/demo-data";
import { getBoxContext } from "@/lib/box-context";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") || 1);
  const boxId = searchParams.get("box") || "";

  if (![1, 7, 30].includes(days)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const ctx = await getBoxContext(boxId);
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const limits = {
    lowerLimit: ctx.lowerLimit,
    upperLimit: ctx.upperLimit,
    boxCode: ctx.box?.box_code || null,
  };

  if (!isThingsBoardConfigured()) {
    return NextResponse.json({ mode: "demo", days, data: getDemoHistory(), ...limits });
  }

  if (!ctx.deviceId) {
    return NextResponse.json({ mode: "no-device", days, data: [], ...limits });
  }

  try {
    const now = Date.now();
    const start = now - days * 24 * 60 * 60 * 1000;

    const interval = {
      1: 300000,
      7: 3600000,
      30: 10800000,
    }[days];

    const query = new URLSearchParams({
      keys: "temperature,humidity",
      startTs: String(start),
      endTs: String(now),
      interval: String(interval),
      intervalType: "MILLISECONDS",
      agg: "AVG",
      orderBy: "ASC",
      limit: "1000",
    });

    const result = await tbFetch(
      `/api/plugins/telemetry/DEVICE/${ctx.deviceId}/values/timeseries?${query}`
    );

    const points = new Map();

    for (const key of ["temperature", "humidity"]) {
      for (const item of result[key] || []) {
        const ts = Number(item.ts);
        if (!points.has(ts)) points.set(ts, { ts });
        points.get(ts)[key] = Number(item.value);
      }
    }

    const data = [...points.values()].sort((a, b) => a.ts - b.ts);

    return NextResponse.json({ mode: "live", days, data, ...limits });
  } catch (error) {
    console.error("History error:", error.message);
    return NextResponse.json(
      { error: "อ่านประวัติ ThingsBoard ไม่สำเร็จ" },
      { status: 502 }
    );
  }
}