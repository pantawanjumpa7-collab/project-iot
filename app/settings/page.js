import { Suspense } from "react";
import { Settings, Thermometer, MapPin, Radio, BellRing, Send } from "lucide-react";
import { isLineConfigured } from "../../lib/line";
import { sendLineTest } from "./actions";

const components = [
  { icon: Thermometer, title: "DHT11", description: "ตรวจวัดอุณหภูมิและความชื้น" },
  { icon: Radio, title: "Arduino Uno R3 + AIS NB-Shield I", description: "ประมวลผลและส่งข้อมูลผ่าน NB-IoT" },
  { icon: MapPin, title: "GPS Module GY-NEO-6M", description: "ส่งพิกัด Latitude และ Longitude" },
  { icon: BellRing, title: "ระบบแจ้งเตือน", description: "ThingsBoard Alarm และ LINE OA" },
];

async function LineResult({ searchParams }) {
  const params = await searchParams;

  if (params?.line_ok) {
    return (
      <div className="notice" style={{ background: "#dcfce7", color: "#166534" }}>
        ส่งข้อความทดสอบแล้ว ตรวจดูใน LINE ที่แอดเพื่อน OA ไว้
      </div>
    );
  }

  if (params?.line_error) {
    return (
      <div className="notice" style={{ background: "#fee2e2", color: "#b91c1c" }}>
        ส่งไม่สำเร็จ: {params.line_error}
      </div>
    );
  }

  return null;
}

export default function SettingsPage({ searchParams }) {
  const lineReady = isLineConfigured();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>ตั้งค่าระบบ</h1>
          <p>องค์ประกอบและค่าพื้นฐานของระบบติดตามวัคซีน</p>
        </div>
        <Settings size={26} color="#0c9488" />
      </header>

      <Suspense fallback={null}>
        <LineResult searchParams={searchParams} />
      </Suspense>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2 className="panel-title">การแจ้งเตือนผ่าน LINE OA</h2>
        <p>
          สถานะ:{" "}
          <strong style={{ color: lineReady ? "#166534" : "#b91c1c" }}>
            {lineReady ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN"}
          </strong>
        </p>
        <p className="panel-subtitle">
          ระบบส่งข้อความถึงทุกคนที่แอดเพื่อน LINE OA เมื่อมีการแจ้งเหตุการณ์ระหว่างขนส่ง
          ส่วน Alarm อุณหภูมิผิดเกณฑ์ส่งจาก ThingsBoard Rule Chain โดยตรง
        </p>
        {lineReady && (
          <form action={sendLineTest} style={{ marginTop: 12 }}>
            <button type="submit" className="primary-button">
              <Send size={16} />
              ส่งข้อความทดสอบ
            </button>
          </form>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2 className="panel-title">เกณฑ์อุณหภูมิ</h2>
        <p>
          ค่าเริ่มต้น: <strong>2–8 °C</strong>
        </p>
        <p className="panel-subtitle">
          เมื่อกล่องอยู่ในเที่ยวขนส่ง ระบบใช้เกณฑ์ของประเภทวัคซีนในเที่ยวนั้นแทน
          (กำหนดได้ที่เมนูประเภทวัคซีน)
        </p>
      </section>

      <section className="info-grid">
        {components.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="info-card">
              <Icon size={28} color="#0c9488" />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          );
        })}
      </section>
    </>
  );
}