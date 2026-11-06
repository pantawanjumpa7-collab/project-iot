"use client";

const STATUS_LABEL = {
  planned: "วางแผนแล้ว (ยังไม่ออกเดินทาง)",
  in_transit: "กำลังขนส่ง",
};

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

function PersonLine({ person }) {
  if (!person) return <p>ไม่ระบุ</p>;
  return (
    <p>
      {person.full_name || "-"}
      {person.employee_code ? ` (${person.employee_code})` : ""}
      {person.phone && (
        <>
          {" · "}
          <a href={`tel:${person.phone}`} style={{ color: "#0c9488" }}>☎ {person.phone}</a>
        </>
      )}
    </p>
  );
}

export default function TripInfo({ box, trip }) {
  return (
    <div className="panel">
      <h2 className="panel-title">ข้อมูลเที่ยวขนส่ง</h2>

      {!box && (
        <p className="panel-subtitle">ยังไม่ได้เลือกกล่องวัคซีน หรือยังไม่ได้เพิ่มกล่องในระบบ</p>
      )}

      {box && !trip && (
        <p className="panel-subtitle">กล่อง {box.box_code} ยังไม่มีเที่ยวขนส่งที่กำลังดำเนินการ</p>
      )}

      {trip && (
        <div className="status-list">
          <div className="status-row">
            <span className="status-dot" style={{ background: "#0c9488" }} />
            <div>
              <strong>เที่ยว {trip.trip_code}</strong>
              <p>
                {STATUS_LABEL[trip.status] || trip.status}
                {trip.started_at
                  ? ` · ออกเดินทาง ${formatTime(trip.started_at)}`
                  : trip.planned_start
                    ? ` · กำหนดออก ${formatTime(trip.planned_start)}`
                    : ""}
              </p>
            </div>
          </div>

          <div className="status-row">
            <span className="status-dot" style={{ background: "#7c3aed" }} />
            <div>
              <strong>วัคซีน</strong>
              <p>
                {trip.vaccine
                  ? `${trip.vaccine.name} · เกณฑ์ ${trip.vaccine.min_temp}–${trip.vaccine.max_temp} °C`
                  : "-"}
              </p>
            </div>
          </div>

          <div className="status-row">
            <span className="status-dot" style={{ background: "#3869ba" }} />
            <div>
              <strong>เส้นทาง</strong>
              <p>{trip.origin} → {trip.destination}</p>
            </div>
          </div>

          <div className="status-row">
            <span className="status-dot" style={{ background: "#d97706" }} />
            <div>
              <strong>คนขับ</strong>
              <PersonLine person={trip.driver} />
            </div>
          </div>

          <div className="status-row">
            <span className="status-dot" style={{ background: "#16804a" }} />
            <div>
              <strong>พนักงานผู้ดูแล</strong>
              <PersonLine person={trip.staff} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}