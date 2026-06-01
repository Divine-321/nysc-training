"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Monitor, Award, LogOut } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Training", href: "/staff/training", icon: BarChart2 },
  { label: "Result", href: "/staff/result", icon: Monitor },
  { label: "Certifications", href: "/staff/certifications", icon: Award },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top Header */}
      <header className="h-16 bg-white flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <Image src="/images/nysc-logo.png" alt="NYSC" width={48} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-[#1a6b3c]">Welcome, User</h1>
        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-[#1a6b3c]">
            🔔
          </button>
          <div className="flex items-center gap-2 cursor-pointer">
            <Image
              src="/images/user-avatar.png"
              alt="User"
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
            <span className="text-sm font-medium text-gray-700">User ▾</span>
          </div>
        </div>
      </header>

      <div className="flex pt-16 min-h-screen">

        {/* Sidebar */}
        <aside className="w-60 bg-white fixed top-16 left-0 bottom-0 flex flex-col justify-between py-6 px-4">
          <div>
            {/* Brand */}
            <div className="mb-6 px-2">
              <p className="text-[#1a6b3c] font-bold text-sm leading-tight">
                NATIONAL YOUTH SERVICE CORPS<br />STAFF E-TRAINING
              </p>
            </div>

            <div className="w-full h-px bg-gray-200 mb-4" />

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? "bg-[#e8f5ee] text-[#1a6b3c] font-semibold"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-[#1a6b3c]" : "text-gray-400"} />
                    {label}
                  </Link>
                );
              })}

              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full mt-4">
                <LogOut size={18} />
                Sign out
              </button>
            </nav>
          </div>

          {/* Help Card */}
          <div className="bg-[#1a6b3c] rounded-2xl p-4 text-white text-sm">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mb-2 text-[#1a6b3c] font-bold">?</div>
            <p className="font-semibold mb-1">Need help?</p>
            <p className="text-xs text-green-200 mb-3">Please contact us for more questions</p>
            <button className="w-full border border-white rounded-full py-1.5 text-xs font-medium">
              +234 800 0000 000
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-60 flex-1 bg-gray-100 min-h-screen p-6">
          {children}
        </main>

      </div>
    </div>
  );
}