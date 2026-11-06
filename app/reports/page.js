"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
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
import BoxSelector, { useBoxSelection } from "../components/BoxSelector";

function exportCsv(rows, boxCode, lower, upper) {
  if (rows.length === 0) return;

  const columns = ["timestamp", "temperature", "humidity", "in_range"];
  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const content = [
    columns.join(","),
    ...rows.map((row) =>
      columns
        .map((key) => {
          if (key === "timestamp") return escapeCsv(new Date(row.ts).toLocaleString("th-TH"));
          if (key === "in_range") {
            if (!Number.isFinite(row.temperature)) return escapeCsv("");
            return escapeCsv(row.temperature >= lower && row.temperature <= upper ? "yes" : "no");
          }
          return escapeCsv(row[key]);
        })
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vaccine-report-${boxCode || "device"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const MODE_LABEL = {
  live: "ข้อมูลจริง",
  demo: "ข้อมูลตัวอย่าง",
  "no-device": "กล่องนี้ยังไม่ผูกอุปกรณ์",
};

export default function ReportsPage() {
  const { boxes, role, boxId, setBoxId, ready } = useBoxSelection();

  const [days, setDays] = useState("1");
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState("");
  const [limits, setLimits] = useState({ lower: 2, upper: 8, boxCode: null });
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const noTripForDriver = ready && role === "driver" && boxes.length === 0;
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!ready || noTripForDriver) return;

    const controller = new AbortController();
    const boxQuery = boxId ? `&box=${encodeURIComponent(boxId)}` : "";

    fetch(`/api/vaccine/history?days=${days}${boxQuery}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("โหลดรายงานไม่สำเร็จ");
        return response.json();
      })
      .then((result) => {
        setRows(result.data || []);
        setMode(result.mode || "demo");
        setLimits({
          lower: result.lowerLimit ?? 2,
          upper: result.upperLimit ?? 8,
          boxCode: result.boxCode || null,
        });
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("ไม่สามารถโหลดข้อมูลย้อนหลังได้");
      });

    return () => controller.abort();
  }, [days, boxId, ready, noTripForDriver, reloadKey]);

  const { lower, upper, boxCode } = limits;

  const temps = rows.map((row) => row.temperature).filter(Number.isFinite);
  const average = temps.length ? temps.reduce((sum, v) => sum + v, 0) / temps.length : null;
  const min = temps.length ? Math.min(...temps) : null;
  const max = temps.length ? Math.max(...temps) : null;
  const outOfRange = temps.filter((t) => t < lower || t > upper).length;

  const chartData = rows.map((row) => ({
    ...row,
    time: new Date(row.ts).toLocaleString("th-TH", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  if (noTripForDriver) {
    return (
      <>
        <header className="page-header">
          <div>
            <h1>รายงานการขนส่งวัคซีน</h1>
            <p>ตรวจสอบข้อมูลย้อนหลังและส่งออกผลการตรวจวัด</p>
          </div>
        </header>
        <div className="notice">ยังไม่มีเที่ยวขนส่งที่ได้รับมอบหมาย</div>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>รายงานการขนส่งวัคซีน</h1>
          <p>ตรวจสอบข้อมูลย้อนหลังและส่งออกผลการตรวจวัด</p>
        </div>
        <span className="demo-badge">{MODE_LABEL[mode] || "กำลังโหลด"}</span>
      </header>

      {error && <div className="notice">{error}</div>}

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="table-heading">
          <h2>เงื่อนไขรายงาน</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <BoxSelector boxes={boxes} boxId={boxId} onChange={setBoxId} />

            <select className="form-control" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="1">ย้อนหลัง 24 ชั่วโมง</option>
              <option value="7">ย้อนหลัง 7 วัน</option>
              <option value="30">ย้อนหลัง 30 วัน</option>
            </select>

            <button className="secondary-button" onClick={reload}>
              <RefreshCw size={15} />
              โหลดใหม่
            </button>

            <button
              className="primary-button"
              onClick={() => exportCsv(rows, boxCode, lower, upper)}
              disabled={!rows.length}
            >
              <Download size={15} />
              ดาวน์โหลด CSV
            </button>
          </div>
        </div>

        <p className="panel-subtitle">
          กล่อง {boxCode || "-"} · เกณฑ์อุณหภูมิ {lower}–{upper} °C · ค่าสถิติคำนวณจากค่าเฉลี่ยในแต่ละช่วงเวลา
        </p>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">อุณหภูมิต่ำสุด</p>
          <div className="stat-value">{min == null ? "--" : min.toFixed(2)} °C</div>
        </div>
        <div className="stat-card">
          <p className="stat-label">อุณหภูมิสูงสุด</p>
          <div className="stat-value">{max == null ? "--" : max.toFixed(2)} °C</div>
        </div>
        <div className="stat-card">
          <p className="stat-label">อุณหภูมิเฉลี่ย</p>
          <div className="stat-value">{average == null ? "--" : average.toFixed(2)} °C</div>
        </div>
        <div className="stat-card">
          <p className="stat-label">ช่วงที่ผิดเกณฑ์ / ทั้งหมด</p>
          <div className="stat-value" style={outOfRange > 0 ? { color: "#b91c1c" } : undefined}>
            {outOfRange} / {temps.length}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2 className="panel-title">กราฟอุณหภูมิย้อนหลัง</h2>
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
              <Line type="monotone" dataKey="temperature" name="อุณหภูมิ (°C)" stroke="#0c9488" dot={false} />
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
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const t = row.temperature;
              const bad = Number.isFinite(t) && (t < lower || t > upper);
              return (
                <tr key={row.ts}>
                  <td>{new Date(row.ts).toLocaleString("th-TH")}</td>
                  <td>{Number.isFinite(t) ? t.toFixed(2) : "-"}</td>
                  <td>{Number.isFinite(row.humidity) ? row.humidity.toFixed(1) : "-"}</td>
                  <td>
                    {Number.isFinite(t) && (
                      <span className={bad ? "status-badge danger" : "status-badge good"}>
                        {bad ? "ผิดเกณฑ์" : "ปกติ"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td colSpan="4" className="empty-state">
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