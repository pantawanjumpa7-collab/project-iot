
"use client";

import { useEffect, useState } from "react";
import { BellRing, RefreshCw } from "lucide-react";

function formatDate(ts) {
  return ts
    ? new Date(ts).toLocaleString("th-TH")
    : "-";
}

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState([]);
  const [mode, setMode] = useState("demo");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");

  async function loadAlarms() {
    try {
      const response = await fetch(
        "/api/vaccine/alarms",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("โหลดรายการแจ้งเตือนไม่สำเร็จ");
      }

      const result = await response.json();

      setAlarms(result.data || []);
      setMode(result.mode || "demo");
      setError("");
    } catch {
      setError("ไม่สามารถโหลดประวัติ Alarm ได้");
    }
  }

  
useEffect(() => {
  let cancelled = false;

  fetch("/api/vaccine/alarms", {
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("โหลดรายการแจ้งเตือนไม่สำเร็จ");
      }

      return response.json();
    })
    .then((result) => {
      if (cancelled) return;

      setAlarms(result.data || []);
      setMode(result.mode || "demo");
      setError("");
    })
    .catch(() => {
      if (!cancelled) {
        setError("ไม่สามารถโหลดประวัติ Alarm ได้");
      }
    });

  return () => {
    cancelled = true;
  };
}, []);

  const filtered = alarms.filter((alarm) =>
    status === "ALL" ? true : alarm.status === status
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>การแจ้งเตือนและประวัติ</h1>
          <p>
            ตรวจสอบเหตุการณ์ผิดปกติจากระบบติดตามวัคซีน
          </p>
        </div>

        <span className="demo-badge">
          {mode === "live" ? "ข้อมูล ThingsBoard" : "ข้อมูลตัวอย่าง"}
        </span>
      </header>

      {error && <div className="notice">{error}</div>}

      <section className="table-panel">
        <div className="table-heading">
          <h2>
            <BellRing
              size={18}
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            ประวัติ Alarm
          </h2>

          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="form-control"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="ACTIVE">Active</option>
              <option value="CLEARED">Cleared</option>
            </select>

            <button
              className="secondary-button"
              onClick={loadAlarms}
            >
              <RefreshCw size={15} />
              รีเฟรช
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ประเภท</th>
              <th>รายละเอียด</th>
              <th>ระดับ</th>
              <th>สถานะ</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((alarm) => (
              <tr key={alarm.id}>
                <td>{formatDate(alarm.createdTime)}</td>
                <td>{alarm.type}</td>
                <td>{alarm.message}</td>
                <td>{alarm.severity}</td>
                <td>
                  <span
                    className={
                      alarm.status === "ACTIVE"
                        ? "status-badge danger"
                        : alarm.status === "CLEARED"
                          ? "status-badge good"
                          : "status-badge warning"
                    }
                  >
                    {alarm.status}
                  </span>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-state">
                  ไม่พบรายการตามสถานะที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}