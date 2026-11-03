
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  MapPin,
  BellRing,
  FileBarChart,
  Settings,
  Thermometer,
  ShieldCheck,
} from "lucide-react";

const menuItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/tracking",
    label: "ติดตามการขนส่ง",
    icon: MapPin,
  },
  {
    href: "/alarms",
    label: "การแจ้งเตือน",
    icon: BellRing,
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: FileBarChart,
  },
  {
    href: "/settings",
    label: "ตั้งค่าระบบ",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Thermometer size={25} />
        </div>

        <div>
          <h2>Vaccine Monitor</h2>
          <p>Cold Chain Monitoring</p>
        </div>
      </div>

      <div className="menu-label">
        เมนูหลัก
      </div>

      <nav className="side-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <ShieldCheck size={18} />
        <div>
          <strong>IoT Monitoring</strong>
          <p>Vaccine Transport System</p>
        </div>
      </div>
    </aside>
  );
}