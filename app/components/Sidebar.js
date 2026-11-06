"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  BellRing,
  FileBarChart,
  Settings,
  Thermometer,
  ShieldCheck,
  Package,
  Syringe,
  Truck,
} from "lucide-react";

const mainMenu = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracking", label: "ติดตามการขนส่ง", icon: MapPin },
  { href: "/alarms", label: "การแจ้งเตือน", icon: BellRing },
  { href: "/reports", label: "รายงาน", icon: FileBarChart },
];

const manageMenu = [
  { href: "/trips", label: "เที่ยวขนส่ง", icon: Truck },
  { href: "/boxes", label: "กล่องวัคซีน", icon: Package },
  { href: "/vaccine-types", label: "ประเภทวัคซีน", icon: Syringe },
  { href: "/settings", label: "ตั้งค่าระบบ", icon: Settings },
];

function NavList({ items, pathname }) {
  return (
    <nav className="side-nav">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "nav-link active" : "nav-link"}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

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

      <div className="menu-label">เมนูหลัก</div>
      <NavList items={mainMenu} pathname={pathname} />

      <div className="menu-label" style={{ marginTop: 16 }}>
        จัดการข้อมูล
      </div>
      <NavList items={manageMenu} pathname={pathname} />

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