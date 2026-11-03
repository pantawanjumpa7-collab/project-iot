
import { NextResponse } from "next/server";
import {
  isThingsBoardConfigured,
  tbFetch,
} from "@/lib/thingsboard";
import { getDemoAlarms } from "@/lib/demo-data";

export async function GET() {
  if (!isThingsBoardConfigured()) {
    return NextResponse.json({
      mode: "demo",
      data: getDemoAlarms(),
    });
  }

  try {
    const body = {
      entityFilter: {
        type: "entityType",
        entityType: "DEVICE",
      },
      keyFilters: [],
      pageLink: {
        pageSize: 50,
        page: 0,
        sortOrder: {
          key: {
            type: "ALARM_FIELD",
            key: "createdTime",
          },
          direction: "DESC",
        },
        statusList: ["ACTIVE", "CLEARED"],
      },
      alarmFields: [
        {
          type: "ALARM_FIELD",
          key: "createdTime",
        },
        {
          type: "ALARM_FIELD",
          key: "type",
        },
        {
          type: "ALARM_FIELD",
          key: "severity",
        },
        {
          type: "ALARM_FIELD",
          key: "status",
        },
      ],
      entityFields: [
        {
          type: "ENTITY_FIELD",
          key: "name",
        },
      ],
    };

    const result = await tbFetch(
      "/api/alarmsQuery/find",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const items = (result.data || []).map(
      (row, index) => {
        const alarm = row.alarm || row;

        return {
          id: alarm.id?.id || alarm.id || String(index),
          createdTime: alarm.createdTime,
          type: alarm.type || "UNKNOWN",
          severity: alarm.severity || "WARNING",
          status: alarm.status || "ACTIVE",
          message:
            alarm.details?.message ||
            row.entityName ||
            "ตรวจสอบรายละเอียดใน ThingsBoard",
        };
      }
    );

    return NextResponse.json({
      mode: "live",
      data: items,
    });
  } catch (error) {
    console.error("Alarm query error:", error.message);

    return NextResponse.json(
      { error: "อ่านข้อมูล Alarm ไม่สำเร็จ" },
      { status: 502 }
    );
  }
}