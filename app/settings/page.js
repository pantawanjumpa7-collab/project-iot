
import { Settings, Thermometer, MapPin, Radio, BellRing } from "lucide-react";

const components = [
  {
    icon: Thermometer,
    title: "DHT11",
    description: "ตรวจวัดอุณหภูมิและความชื้น",
  },
  {
    icon: Radio,
    title: "Arduino Uno R3 + AIS NB-Shield I",
    description: "ประมวลผลและส่งข้อมูลผ่าน NB-IoT",
  },
  {
    icon: MapPin,
    title: "GPS Module GY-NEO-6M",
    description: "ส่งพิกัด Latitude และ Longitude",
  },
  {
    icon: BellRing,
    title: "ระบบแจ้งเตือน",
    description: "ThingsBoard Alarm และ LINE OA",
  },
];

export default function SettingsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>ตั้งค่าระบบ</h1>
          <p>องค์ประกอบและค่าพื้นฐานของระบบติดตามวัคซีน</p>
        </div>

        <Settings size={26} color="#0c9488" />
      </header>

      <div className="notice">
        หน้านี้เป็นข้อมูลประกอบการตั้งค่าระบบ
        ยังไม่มีการแก้ไขค่าบนอุปกรณ์หรือ ThingsBoard จากหน้าเว็บ
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2 className="panel-title">
          เกณฑ์อุณหภูมิที่ใช้ในต้นแบบ
        </h2>

        <p>
          ค่าต่ำสุด: <strong>2 °C</strong>
        </p>

        <p>
          ค่าสูงสุด: <strong>8 °C</strong>
        </p>

        <p className="panel-subtitle">
          เป็นเกณฑ์อ้างอิงตามงานวิจัยของคุณ
          ต้องปรับตามข้อกำหนดของวัคซีนที่ใช้จริงก่อนนำไปใช้งาน
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