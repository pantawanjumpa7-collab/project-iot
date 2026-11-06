"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Navigation, Radio } from "lucide-react";
import BoxSelector, { useBoxSelection } from "../components/BoxSelector";
import TripInfo from "../components/TripInfo";

export default function TrackingPage() {
  const { boxes, role, boxId, setBoxId, ready } = useBoxSelection();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const noTripForDriver = ready && role === "driver" && boxes.length === 0;

  useEffect(() => {
    if (!ready || noTripForDriver) return;

    let alive = true;
    const boxQuery = boxId ? `?box=${encodeURIComponent(boxId)}` : "";

    async function load() {
      try {
        const response = await fetch(`/api/vaccine/telemetry${boxQuery}`, { cache: "no-store" });
        if (!response.ok) throw new Error("โหลดข้อมูลตำแหน่งไม่สำเร็จ");
        const result = await response.json();
        if (alive) {
          setData(result);
          setError("");
        }
      } catch {
        if (alive) setError("ไม่สามารถโหลดข้อมูลตำแหน่งได้");
      }
    }

    load();
    const timer = setInterval(load, 30000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [ready, boxId, noTripForDriver]);

  const hasGps =
    Number.isFinite(data?.latitude) &&
    Number.isFinite(data?.longitude) &&
    !(data.latitude === 0 && data.longitude === 0);

  const mapUrl = hasGps
    ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
    : null;

  const embedUrl = hasGps
    ? `https://maps.google.com/maps?q=${data.latitude},${data.longitude}&z=15&output=embed`
    : null;

  if (noTripForDriver) {
    return (
      <>
        <header className="page-header">
          <div>
            <h1>ติดตามการขนส่ง</h1>
            <p>ตรวจสอบตำแหน่งและสถานะของกล่องวัคซีน</p>
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
          <h1>ติดตามการขนส่ง</h1>
          <p>ตรวจสอบตำแหน่งและสถานะของกล่องวัคซีน</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <BoxSelector boxes={boxes} boxId={boxId} onChange={setBoxId} />
          <span className="demo-badge">
            <Radio size={15} />
            {data?.mode === "live"
              ? "ข้อมูลอุปกรณ์จริง"
              : data?.mode === "no-device"
                ? "กล่องนี้ยังไม่ผูกอุปกรณ์"
                : data
                  ? "ข้อมูลตัวอย่าง"
                  : "กำลังโหลด"}
          </span>
        </div>
      </header>

      {error && <div className="notice">{error}</div>}

      {hasGps && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <h2 className="panel-title">ตำแหน่งบนแผนที่</h2>
          <p className="panel-subtitle">
            ตำแหน่งล่าสุดของกล่อง {data.box?.box_code || data.deviceName}
            {data.gpsTs ? ` · ${new Date(data.gpsTs).toLocaleString("th-TH")}` : ""}
          </p>
          <iframe
            title="แผนที่ตำแหน่งกล่องวัคซีน"
            src={embedUrl}
            style={{ width: "100%", height: 360, border: 0, borderRadius: 12 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      )}

      <div className="info-grid">
        <section className="info-card">
          <MapPin color="#0c9488" size={28} />
          <h3>ตำแหน่งล่าสุด</h3>
          <p>กล่อง: {data?.box?.box_code || data?.deviceName || "กำลังโหลด"}</p>
          <p>Latitude: {data?.latitude ?? "-"}</p>
          <p>Longitude: {data?.longitude ?? "-"}</p>

          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noreferrer" className="primary-button">
              <Navigation size={16} />
              เปิดใน Google Maps
            </a>
          )}

          {data && !hasGps && (
            <p>ยังไม่มีพิกัด GPS จากอุปกรณ์ (รอข้อมูล latitude / longitude)</p>
          )}
        </section>

        <section className="info-card">
          <Radio color="#3869ba" size={28} />
          <h3>สถานะข้อมูล</h3>
          <p>
            อุณหภูมิ: {data?.temperature ?? "--"} °C
            {data?.lowerLimit != null && ` (เกณฑ์ ${data.lowerLimit}–${data.upperLimit} °C)`}
          </p>
          <p>ความชื้น: {data?.humidity ?? "--"} %</p>
          <p>
            ข้อมูลล่าสุด:{" "}
            {data?.lastSeen ? new Date(data.lastSeen).toLocaleString("th-TH") : "-"}
          </p>
        </section>
      </div>

      <div style={{ marginTop: 20 }}>
        <TripInfo box={data?.box} trip={data?.trip} />
      </div>
    </>
  );
}