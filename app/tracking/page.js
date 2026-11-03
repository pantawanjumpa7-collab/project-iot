
"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation, Radio } from "lucide-react";

export default function TrackingPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const response = await fetch(
          "/api/vaccine/telemetry",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("โหลดข้อมูลตำแหน่งไม่สำเร็จ");
        }

        const result = await response.json();

        if (alive) {
          setData(result);
          setError("");
        }
      } catch {
        if (alive) {
          setError("ไม่สามารถโหลดข้อมูลตำแหน่งได้");
        }
      }
    }

    load();

    const timer = setInterval(load, 30000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const hasGps =
    Number.isFinite(data?.latitude) &&
    Number.isFinite(data?.longitude);

  const mapUrl = hasGps
    ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
    : null;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>ติดตามการขนส่ง</h1>
          <p>ตรวจสอบตำแหน่งและสถานะของอุปกรณ์ GPS</p>
        </div>

        <span className="demo-badge">
          <Radio size={15} />
          {data?.mode === "live"
            ? "ข้อมูลอุปกรณ์จริง"
            : "ข้อมูลตัวอย่าง"}
        </span>
      </header>

      {error && <div className="notice">{error}</div>}

      <div className="info-grid">
        <section className="info-card">
          <MapPin color="#0c9488" size={28} />

          <h3>ตำแหน่งล่าสุด</h3>

          <p>
            อุปกรณ์: {data?.deviceName || "กำลังโหลด"}
          </p>

          <p>
            Latitude: {data?.latitude ?? "-"}
          </p>

          <p>
            Longitude: {data?.longitude ?? "-"}
          </p>

          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              <Navigation size={16} />
              เปิดใน Google Maps
            </a>
          )}

          {!hasGps && (
            <p>
              ยังไม่มีพิกัด GPS ที่ใช้งานได้
            </p>
          )}
        </section>

        <section className="info-card">
          <Radio color="#3869ba" size={28} />

          <h3>สถานะข้อมูล</h3>

          <p>
            อุณหภูมิ: {data?.temperature ?? "--"} °C
          </p>

          <p>
            ความชื้น: {data?.humidity ?? "--"} %
          </p>

          <p>
            ข้อมูลล่าสุด:{" "}
            {data?.lastSeen
              ? new Date(data.lastSeen).toLocaleString("th-TH")
              : "-"}
          </p>

          <p>
            ข้อมูลนี้เป็นสถานะเซนเซอร์ล่าสุด ไม่ใช่การยืนยันตำแหน่งรถแบบเรียลไทม์จนกว่าจะมี GPS ส่งข้อมูลจริง
          </p>
        </section>
      </div>
    </>
  );
}