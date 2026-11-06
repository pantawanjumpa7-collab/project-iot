import { NextResponse } from "next/server";
import { isThingsBoardConfigured, tbFetch } from "@/lib/thingsboard";
import { getDemoAlarms } from "@/lib/demo-data";
import { getBoxContext, getRole } from "@/lib/box-context";

export async function GET(request) {
  const boxId = new URL(request.url).searchParams.get("box") || "";

  let deviceId = null;

  if (boxId) {
    const ctx = await getBoxContext(boxId);
    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    if (!ctx.deviceId) {
      return NextResponse.json({ mode: "no-device", data: [] });
    }
    deviceId = ctx.deviceId;
  } else {
    const role = await getRole();
    if (!role) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }
    if (role === "driver") {
      return NextResponse.json({ mode: "live", data: [] });
    }
  }

  if (!isThingsBoardConfigured()) {
    return NextResponse.json({ mode: "demo", data: getDemoAlarms() });
  }

  try {
    const entityFilter = deviceId
      ? { type: "singleEntity", singleEntity: { entityType: "DEVICE", id: deviceId } }
      : { type: "entityType", entityType: "DEVICE" };

    const body = {
      entityFilter,
      keyFilters: [],
      pageLink: {
        pageSize: 50,
        page: 0,
        sortOrder: {
          key: { type: "ALARM_FIELD", key: "createdTime" },
          direction: "DESC",
        },
        statusList: ["ACTIVE", "CLEARED"],
      },
      alarmFields: [
        { type: "ALARM_FIELD", key: "createdTime" },
        { type: "ALARM_FIELD", key: "type" },
        { type: "ALARM_FIELD", key: "severity" },
        { type: "ALARM_FIELD", key: "status" },
      ],
      entityFields: [{ type: "ENTITY_FIELD", key: "name" }],
    };

    const result = await tbFetch("/api/alarmsQuery/find", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const items = (result.data || []).map((row, index) => {
      const alarm = row.alarm || row;
      return {
        id: alarm.id?.id || alarm.id || String(index),
        createdTime: alarm.createdTime,
        type: alarm.type || "UNKNOWN",
        severity: alarm.severity || "WARNING",
        status: alarm.status || "ACTIVE",
        message: alarm.details?.message || row.entityName || "ตรวจสอบรายละเอียดใน ThingsBoard",
      };
    });

    return NextResponse.json({ mode: "live", data: items });
  } catch (error) {
    console.error("Alarm query error:", error.message);
    return NextResponse.json(
      { error: "อ่านข้อมูล Alarm ไม่สำเร็จ" },
      { status: 502 }
    );
  }
}