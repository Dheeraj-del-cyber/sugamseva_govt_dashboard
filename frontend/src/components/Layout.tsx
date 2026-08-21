import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout({
  title,
  backTo,
  children,
}: {
  title: string;
  backTo?: { to: string; label: string };
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-paper)" }}>
      <Sidebar open={sidebarOpen} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex flex-col min-h-screen min-w-0 lg:pl-64">
        <Header title={title} backTo={backTo} onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 px-4 sm:px-6 py-6 pb-20 max-w-7xl w-full mx-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}