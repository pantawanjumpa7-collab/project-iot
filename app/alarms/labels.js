// ประเภทเหตุการณ์ที่บันทึกได้
export const INCIDENT_TYPES = {
  TEMPERATURE_HIGH: "อุณหภูมิสูงเกินเกณฑ์",
  TEMPERATURE_LOW: "อุณหภูมิต่ำกว่าเกณฑ์",
  DEVICE_NO_DATA: "อุปกรณ์ไม่ส่งข้อมูล",
  LID_OPEN: "ฝากล่องเปิด / ปิดไม่สนิท",
  DELAY: "ล่าช้า / ติดขัดระหว่างทาง",
  ACCIDENT: "อุบัติเหตุ",
  OTHER: "อื่น ๆ",
};

export function typeLabel(type) {
  return INCIDENT_TYPES[type] || type;
}