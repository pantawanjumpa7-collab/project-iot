
"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function exportCsv(rows) {
  if (rows.length === 0) return;

  const columns = [
    "timestamp",
    "temperature",
    "humidity",
  ];

  const escapeCsv = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const content = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((key) => escapeCsv(
        key === "timestamp"
          ? new Date(row.ts).toLocaleString("th-TH")
          : row[key]
      )).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF", content],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "vaccine-monitoring-report.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [days, setDays] = useState("1");
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState("demo");
  const [error, setError] = useState("");

  async function loadHistory(period = days) {
    try {
      const response = await fetch(
        `/api/vaccine/history?days=${period}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("โหลดรายงานไม่สำเร็จ");
      }

      const result = await response.json();

      setRows(result.data || []);
      setMode(result.mode || "demo");
      setError("");
    } catch {
      setError("ไม่สามารถโหลดข้อมูลย้อนหลังได้");
    }
  }

  
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/vaccine/history?days=${days}`, {
    cache: "no-store",
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("โหลดรายงานไม่สำเร็จ");
      }

      return response.json();
    })
    .then((result) => {
      setRows(result.data || []);
      setMode(result.mode || "demo");
      setError("");
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        setError("ไม่สามารถโหลดข้อมูลย้อนหลังได้");
      }
    });

  return () => {
    controller.abort();
  };
}, [days]);

  const temps = rows
    .map((row) => row.temperature)
    .filter(Number.isFinite);

  const average = temps.length
    ? temps.reduce((sum, value) => sum + value, 0) / temps.length
    : null;

  const min = temps.length ? Math.min(...temps) : null;
  const max = temps.length ? Math.max(...temps) : null;

  const chartData = rows.map((row) => ({
    ...row,
    time: new Date(row.ts).toLocaleString("th-TH", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <>
      <header className="page-header">
        <div>
          <h1>รายงานการขนส่งวัคซีน</h1>
          <p>
            ตรวจสอบข้อมูลย้อนหลังและส่งออกผลการตรวจวัด
          </p>
        </div>

        <span className="demo-badge">
          {mode === "live" ? "ข้อมูลจริง" : "ข้อมูลตัวอย่าง"}
        </span>
      </header>

      {error && <div className="notice">{error}</div>}

      <section
        className="panel"
        style={{ marginBottom: 20 }}
      >
        <div className="table-heading">
          <h2>เงื่อนไขรายงาน</h2>

          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="form-control"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            >
              <option value="1">ย้อนหลัง 24 ชั่วโมง</option>
              <option value="7">ย้อนหลัง 7 วัน</option>
              <option value="30">ย้อนหลัง 30 วัน</option>
            </select>

            <button
              className="secondary-button"
              onClick={() => loadHistory(days)}
            >
              <RefreshCw size={15} />
              โหลดใหม่
            </button>

            <button
              className="primary-button"
              onClick={() => exportCsv(rows)}
              disabled={!rows.length}
            >
              <Download size={15} />
              ดาวน์โหลด CSV
            </button>
          </div>
        </div>

        <p className="panel-subtitle">
          ค่าสถิติคำนวณจากจุดข้อมูลที่ API ส่งกลับมา
        </p>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">อุณหภูมิต่ำสุด</p>
          <div className="stat-value">
            {min == null ? "--" : min.toFixed(2)} °C
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">อุณหภูมิสูงสุด</p>
          <div className="stat-value">
            {max == null ? "--" : max.toFixed(2)} °C
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">อุณหภูมิเฉลี่ย</p>
          <div className="stat-value">
            {average == null ? "--" : average.toFixed(2)} °C
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">จำนวนจุดข้อมูล</p>
          <div className="stat-value">{rows.length}</div>
        </div>
      </section>

      <section
        className="panel"
        style={{ marginBottom: 20 }}
      >
        <h2 className="panel-title">กราฟอุณหภูมิย้อนหลัง</h2>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="temperature"
                name="อุณหภูมิ (°C)"
                stroke="#0c9488"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="table-panel">
        <div className="table-heading">
          <h2>ข้อมูลที่ใช้ในรายงาน</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>อุณหภูมิ (°C)</th>
              <th>ความชื้น (%)</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.ts}>
                <td>
                  {new Date(row.ts).toLocaleString("th-TH")}
                </td>
                <td>{row.temperature ?? "-"}</td>
                <td>{row.humidity ?? "-"}</td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan="3" className="empty-state">
                  ยังไม่มีข้อมูลสำหรับรายงาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}