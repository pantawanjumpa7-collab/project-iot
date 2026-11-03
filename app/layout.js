
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "Vaccine Transport Monitoring",
  description:
    "ระบบติดตามและรายงานการขนส่งวัคซีนด้วย IoT",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <div className="app-shell">
          <Sidebar />

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}