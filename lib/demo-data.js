
export function getDemoTelemetry() {
  return {
    mode: "demo",
    deviceName: "Vaccine Sensor Demo",
    temperature: 6.2,
    humidity: 65,
    latitude: 19.1664,
    longitude: 99.9022,
    lastSeen: Date.now(),
    lowerLimit: 2,
    upperLimit: 8,
  };
}

export function getDemoHistory() {
  const now = Date.now();

  return Array.from({ length: 24 }, (_, i) => {
    const ts = now - (23 - i) * 60 * 60 * 1000;

    return {
      ts,
      temperature: Number(
        (5.2 + Math.sin(i / 3) * 0.8 + i * 0.025).toFixed(2)
      ),
      humidity: Number(
        (60 + Math.cos(i / 4) * 5).toFixed(1)
      ),
    };
  });
}

export function getDemoAlarms() {
  return [
    {
      id: "ALARM-DEMO-001",
      createdTime: Date.now() - 30 * 60 * 1000,
      type: "TEMPERATURE_HIGH",
      severity: "MAJOR",
      status: "ACTIVE",
      message: "อุณหภูมิสูงเกินเกณฑ์ตัวอย่าง",
      temperature: 9.1,
    },
    {
      id: "ALARM-DEMO-002",
      createdTime: Date.now() - 2 * 60 * 60 * 1000,
      type: "DEVICE_NO_DATA",
      severity: "WARNING",
      status: "CLEARED",
      message: "ตัวอย่างเหตุการณ์ข้อมูลขาดช่วง",
      temperature: null,
    },
  ];
}