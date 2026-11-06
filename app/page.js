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
  ReferenceLine,
} from "recharts";
import BoxSelector, { useBoxSelection } from "./components/BoxSelector";
import TripInfo from "./components/TripInfo";

function formatDate(ts) {
  if (!ts) return "-";

  return new Date(ts).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const MODE_LABEL = {
  live: "ข้อมูลจาก ThingsBoard",
  demo: "ข้อมูลตัวอย่าง",
  "no-device": "กล่องนี้ยังไม่ผูกอุปกรณ์",
};

export default function DashboardPage() {
  const { boxes, role, boxId, setBoxId, ready } = useBoxSelection();

  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [error, setError] = useState("");

  const noTripForDriver = ready && role === "driver" && boxes.length === 0;

  useEffect(() => {
    if (!ready || noTripForDriver) return;

    let alive = true;
    const boxQuery = boxId ? `box=${encodeURIComponent(boxId)}` : "";

    async function loadData() {
      try {
        const responses = await Promise.all([
          fetch(`/api/vaccine/telemetry?${boxQuery}`, { cache: "no-store" }),
          fetch(`/api/vaccine/history?days=1&${boxQuery}`, { cache: "no-store" }),
          fetch(`/api/vaccine/alarms?${boxQuery}`, { cache: "no-store" }),
        ]);

        if (responses.some((response) => !response.ok)) {
          throw new Error("โหลดข้อมูลไม่สำเร็จ");
        }

        const [telemetryData, historyData, alarmData] = await Promise.all(
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
  }, [ready, boxId, noTripForDriver]);

  const lower = telemetry?.lowerLimit ?? 2;
  const upper = telemetry?.upperLimit ?? 8;
  const temperature = telemetry?.temperature;
  const humidity = telemetry?.humidity;

  const tempStatus =
    temperature == null
      ? "ไม่มีข้อมูล"
      : temperature < lower || temperature > upper
        ? "ผิดเกณฑ์"
        : "อยู่ในเกณฑ์";

  const limitNote =
    telemetry?.limitSource === "vaccine"
      ? `เกณฑ์ ${telemetry.trip?.vaccine?.name} ${lower}–${upper} °C`
      : `เกณฑ์มาตรฐาน ${lower}–${upper} °C`;

  const activeAlarms = alarms.filter((alarm) => alarm.status === "ACTIVE").length;

  const chartData = history.map((item) => ({
    ...item,
    time: new Date(item.ts).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  if (noTripForDriver) {
    return (
      <>
        <header className="page-header">
          <div>
            <h1>Dashboard ภาพรวม</h1>
            <p>ระบบติดตามและรายงานการขนส่งวัคซีนด้วย IoT</p>
          </div>
        </header>
        <div className="notice">
          ยังไม่มีเที่ยวขนส่งที่ได้รับมอบหมาย ดูรายละเอียดได้ที่เมนู{" "}
          <Link href="/trips">เที่ยวขนส่ง</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard ภาพรวม</h1>
          <p>ระบบติดตามและรายงานการขนส่งวัคซีนด้วย IoT</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <BoxSelector boxes={boxes} boxId={boxId} onChange={setBoxId} />
          <span className="demo-badge">
            <Activity size={15} />
            {MODE_LABEL[telemetry?.mode] || "กำลังโหลด"}
          </span>
        </div>
      </header>

      {error && <div className="notice">{error}</div>}

      {telemetry?.mode === "no-device" && (
        <div className="notice">
          กล่อง {telemetry.box?.box_code} ยังไม่ได้ผูก Device ID ของ ThingsBoard
          เพิ่มได้ที่เมนู <Link href="/boxes">กล่องวัคซีน</Link>
        </div>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">อุณหภูมิล่าสุด</span>
            <div className="stat-icon" style={{ background: "#e4f6f2", color: "#0c9488" }}>
              <Thermometer size={21} />
            </div>
          </div>
          <div
            className="stat-value"
            style={tempStatus === "ผิดเกณฑ์" ? { color: "#b91c1c" } : undefined}
          >
            {temperature ?? "--"} °C
          </div>
          <div className="stat-note">
            {limitNote} · {tempStatus}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">ความชื้นล่าสุด</span>
            <div className="stat-icon" style={{ background: "#e6efff", color: "#3869ba" }}>
              <Droplets size={21} />
            </div>
          </div>
          <div className="stat-value">{humidity ?? "--"} %</div>
          <div className="stat-note">ค่าที่อ่านได้จากเซนเซอร์</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">กล่องวัคซีน</span>
            <div className="stat-icon" style={{ background: "#e4f6ec", color: "#16804a" }}>
              <Radio size={21} />
            </div>
          </div>
          <div className="stat-value">
            {telemetry ? telemetry.box?.box_code || "-" : "กำลังโหลด"}
          </div>
          <div className="stat-note">
            {telemetry?.deviceId
              ? `อุปกรณ์ ${telemetry.deviceId.slice(0, 8)}… · อัปเดตทุก 30 วินาที`
              : "อัปเดตทุก 30 วินาที"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Alarm ที่ยัง Active</span>
            <div className="stat-icon" style={{ background: "#fff0df", color: "#b66b13" }}>
              <BellRing size={21} />
            </div>
          </div>
          <div className="stat-value">{activeAlarms}</div>
          <div className="stat-note">เฉพาะอุปกรณ์ของกล่องที่เลือก</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <h2 className="panel-title">กราฟอุณหภูมิย้อนหลัง</h2>
          <p className="panel-subtitle">
            ย้อนหลัง 24 ชั่วโมง · เส้นประสีแดงคือเกณฑ์ {lower}–{upper} °C
          </p>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis
                  domain={[
                    (dataMin) => Math.floor(Math.min(dataMin, lower) - 1),
                    (dataMax) => Math.ceil(Math.max(dataMax, upper) + 1),
                  ]}
                />
                <Tooltip />
                <ReferenceLine y={upper} stroke="#dc2626" strokeDasharray="6 4" />
                <ReferenceLine y={lower} stroke="#dc2626" strokeDasharray="6 4" />
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

        <TripInfo box={telemetry?.box} trip={telemetry?.trip} />
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2 className="panel-title">สรุปสถานะระบบ</h2>

        <div className="status-list">
          <div className="status-row">
            <span
              className="status-dot"
              style={{ background: tempStatus === "ผิดเกณฑ์" ? "#dc2626" : "#0c9488" }}
            />
            <div>
              <strong>อุณหภูมิ</strong>
              <p>{tempStatus}</p>
            </div>
          </div>

          <div className="status-row">
            <span className="status-dot" style={{ background: "#3869ba" }} />
            <div>
              <strong>ข้อมูลเซนเซอร์</strong>
              <p>
                {telemetry?.lastSeen
                  ? `รับข้อมูลล่าสุด ${formatDate(telemetry.lastSeen)}`
                  : "ยังไม่มีข้อมูล"}
              </p>
            </div>
          </div>

          <div className="status-row">
            <span className="status-dot" style={{ background: "#d97706" }} />
            <div>
              <strong>การแจ้งเตือน</strong>
              <p>มี {activeAlarms} เหตุการณ์ที่ต้องตรวจสอบ</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Link href="/alarms" className="secondary-button">
            ดูประวัติการแจ้งเตือน
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="table-panel">
        <div className="table-heading">
          <h2>เหตุการณ์ล่าสุดของกล่องนี้</h2>
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
                      alarm.status === "ACTIVE" ? "status-badge danger" : "status-badge good"
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