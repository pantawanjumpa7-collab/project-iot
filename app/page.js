
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Thermometer,
  Droplets,
  Radio,
  BellRing,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatDate(ts) {
  if (!ts) return "-";

  return new Date(ts).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      try {
        const responses = await Promise.all([
          fetch("/api/vaccine/telemetry", {
            cache: "no-store",
          }),
          fetch("/api/vaccine/history?days=1", {
            cache: "no-store",
          }),
          fetch("/api/vaccine/alarms", {
            cache: "no-store",
          }),
        ]);

        if (responses.some((response) => !response.ok)) {
          throw new Error("โหลดข้อมูลไม่สำเร็จ");
        }

        const [telemetryData, historyData, alarmData] =
          await Promise.all(
            responses.map((response) => response.json())
          );

        if (!alive) return;

        setTelemetry(telemetryData);
        setHistory(historyData.data || []);
        setAlarms(alarmData.data || []);
        setError("");
      } catch {
        if (alive) {
          setError("ไม่สามารถโหลดข้อมูลระบบได้");
        }
      }
    }

    loadData();

    const timer = setInterval(loadData, 30000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const temperature = telemetry?.temperature;
  const humidity = telemetry?.humidity;

  const tempStatus =
    temperature == null
      ? "ไม่มีข้อมูล"
      : temperature < 2 || temperature > 8
        ? "ผิดเกณฑ์"
        : "อยู่ในเกณฑ์";

  const activeAlarms = alarms.filter(
    (alarm) => alarm.status === "ACTIVE"
  ).length;

  const chartData = history.map((item) => ({
    ...item,
    time: new Date(item.ts).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard ภาพรวม</h1>
          <p>
            ระบบติดตามและรายงานการขนส่งวัคซีนด้วย IoT
          </p>
        </div>

        <span className="demo-badge">
          <Activity size={15} />
          {telemetry?.mode === "live"
            ? "ข้อมูลจาก ThingsBoard"
            : "ข้อมูลตัวอย่าง"}
        </span>
      </header>

      {error && (
        <div className="notice">{error}</div>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              อุณหภูมิล่าสุด
            </span>
            <div
              className="stat-icon"
              style={{
                background: "#e4f6f2",
                color: "#0c9488",
              }}
            >
              <Thermometer size={21} />
            </div>
          </div>

          <div className="stat-value">
            {temperature ?? "--"} °C
          </div>

          <div className="stat-note">
            เกณฑ์ตัวอย่าง 2–8 °C · {tempStatus}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              ความชื้นล่าสุด
            </span>
            <div
              className="stat-icon"
              style={{
                background: "#e6efff",
                color: "#3869ba",
              }}
            >
              <Droplets size={21} />
            </div>
          </div>

          <div className="stat-value">
            {humidity ?? "--"} %
          </div>

          <div className="stat-note">
            ค่าที่อ่านได้จากเซนเซอร์
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              อุปกรณ์ตรวจวัด
            </span>
            <div
              className="stat-icon"
              style={{
                background: "#e4f6ec",
                color: "#16804a",
              }}
            >
              <Radio size={21} />
            </div>
          </div>

          <div className="stat-value" style={{ fontSize: 21 }}>
            {telemetry ? telemetry.deviceName : "กำลังโหลด"}
          </div>

          <div className="stat-note">
            อัปเดตทุก 30 วินาที
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">
              Alarm ที่ยัง Active
            </span>
            <div
              className="stat-icon"
              style={{
                background: "#fff0df",
                color: "#b66b13",
              }}
            >
              <BellRing size={21} />
            </div>
          </div>

          <div className="stat-value">
            {activeAlarms}
          </div>

          <div className="stat-note">
            ตรวจสอบรายละเอียดในเมนูแจ้งเตือน
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2 className="panel-title">
            กราฟอุณหภูมิย้อนหลัง
          </h2>

          <p className="panel-subtitle">
            แสดงข้อมูลย้อนหลัง 24 ชั่วโมง
          </p>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="อุณหภูมิ (°C)"
                  stroke="#0c9488"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">
            สรุปสถานะระบบ
          </h2>

          <p className="panel-subtitle">
            สถานะจากข้อมูลที่อ่านได้ล่าสุด
          </p>

          <div className="status-list">
            <div className="status-row">
              <span
                className="status-dot"
                style={{ background: "#0c9488" }}
              />
              <div>
                <strong>อุณหภูมิ</strong>
                <p>{tempStatus}</p>
              </div>
            </div>

            <div className="status-row">
              <span
                className="status-dot"
                style={{ background: "#3869ba" }}
              />
              <div>
                <strong>ข้อมูลเซนเซอร์</strong>
                <p>
                  {telemetry
                    ? `รับข้อมูล ${formatDate(telemetry.lastSeen)}`
                    : "ยังไม่มีข้อมูล"}
                </p>
              </div>
            </div>

            <div className="status-row">
              <span
                className="status-dot"
                style={{ background: "#d97706" }}
              />
              <div>
                <strong>การแจ้งเตือน</strong>
                <p>มี {activeAlarms} เหตุการณ์ที่ต้องตรวจสอบ</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <Link href="/alarms" className="secondary-button">
              ดูประวัติการแจ้งเตือน
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="table-panel">
        <div className="table-heading">
          <h2>เหตุการณ์ล่าสุด</h2>
          <Link href="/alarms" className="secondary-button">
            ดูทั้งหมด
          </Link>
        </div>

        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ประเภทเหตุการณ์</th>
              <th>รายละเอียด</th>
              <th>ระดับ</th>
              <th>สถานะ</th>
            </tr>
          </thead>

          <tbody>
            {alarms.slice(0, 5).map((alarm) => (
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
                        : "status-badge good"
                    }
                  >
                    {alarm.status}
                  </span>
                </td>
              </tr>
            ))}

            {alarms.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-state">
                  ยังไม่มีรายการแจ้งเตือน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}