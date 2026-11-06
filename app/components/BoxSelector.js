"use client";

import { useCallback, useEffect, useState } from "react";
import { Package } from "lucide-react";

const STORAGE_KEY = "vaccine.selectedBoxId";

export function useBoxSelection() {
  const [boxes, setBoxes] = useState([]);
  const [role, setRole] = useState(null);
  const [boxId, setBoxIdState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch("/api/vaccine/boxes", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { boxes: [] }))
      .then((result) => {
        if (!alive) return;

        const list = result.boxes || [];

        let saved = "";
        try {
          saved = window.localStorage.getItem(STORAGE_KEY) || "";
        } catch {
          saved = "";
        }

        const initial = list.some((b) => b.id === saved)
          ? saved
          : list.find((b) => b.status === "in_transit")?.id || list[0]?.id || "";

        setBoxes(list);
        setRole(result.role || null);
        setBoxIdState(initial);
        setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const setBoxId = useCallback((id) => {
    setBoxIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ไม่เป็นไร
    }
  }, []);

  return { boxes, role, boxId, setBoxId, ready };
}

export default function BoxSelector({ boxes, boxId, onChange }) {
  if (!boxes.length) return null;

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155" }}>
      <Package size={17} />
      <select
        className="form-control"
        value={boxId}
        onChange={(event) => onChange(event.target.value)}
        style={{ minWidth: 200 }}
      >
        {boxes.map((b) => (
          <option key={b.id} value={b.id}>
            {b.box_code}
            {b.name ? ` - ${b.name}` : ""}
            {b.tb_device_id ? "" : " (ยังไม่ผูกอุปกรณ์)"}
          </option>
        ))}
      </select>
    </label>
  );
}