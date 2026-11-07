import { isThingsBoardConfigured, tbFetch } from "./thingsboard";
import { getDemoAlarms } from "./demo-data";

// ดึงรายการ Alarm จาก ThingsBoard
// deviceId = null หมายถึงทุกอุปกรณ์
export async function fetchTbAlarms(deviceId = null) {
  if (!isThingsBoardConfigured()) {
    return {
      mode: "demo",
      data: getDemoAlarms().map((a) => ({ ...a, deviceId: null })),
    };
  }

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

  const data = (result.data || []).map((row, index) => {
    const alarm = row.alarm || row;
    return {
      id: alarm.id?.id || alarm.id || String(index),
      createdTime: alarm.createdTime,
      type: alarm.type || "UNKNOWN",
      severity: alarm.severity || "WARNING",
      status: alarm.status || "ACTIVE",
      message: alarm.details?.message || row.entityName || "",
      deviceId: row.entityId?.id || alarm.originator?.id || null,
    };
  });

  return { mode: "live", data };
}