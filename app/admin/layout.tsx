"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserRound,
  Building2,
  Layers,
  BarChart3,
  History,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Staff", href: "/admin/users", icon: Users },
  { label: "Cohorts", href: "/admin/departments", icon: Layers },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Assignments", href: "/admin/assignments", icon: UserRound },
  { label: "Audit Logs", href: "/admin/audit", icon: History },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Mock signed-in admin (Replace with real auth data later)
  const adminName = "Abba Admin";
  const adminRole = "Super Admin";
  const adminInitial = adminName.charAt(0);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top Header */}
      <header className="h-16 bg-white flex items-center justify-between px-8 fixed top-0 left-64 right-0 z-40 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Admin Portal</h1>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-gray-800 font-bold">{adminName}</span>
            <span className="text-xs text-gray-500 font-medium">{adminRole}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#1a6b3c] text-white flex items-center justify-center text-sm font-bold shadow-sm cursor-pointer hover:bg-[#145530] transition">
            {adminInitial}
          </div>
        </div>
      </header>

      <div className="flex pt-16 min-h-screen">

        {/* Sidebar */}
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1a6b3c] px-4 py-6 flex flex-col justify-between z-50 shadow-xl">
          <div>
            {/* Brand */}
            <div className="mb-6 px-2 flex flex-col items-center text-center gap-4">
              <Image src="/images/nysc-logo.png" alt="NYSC" width={56} height={56} />
              <p className="text-white font-bold text-sm leading-tight">
                NATIONAL YOUTH SERVICE CORPS<br />ADMIN PORTAL
              </p>
            </div>

            <div className="w-full h-px bg-white/20 mb-4" />

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-white text-[#1a6b3c] font-semibold"
                        : "text-green-50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-[#1a6b3c]" : "text-green-200"} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-red-100 w-full mt-4 transition"
          >
            <LogOut size={18} />
            Sign out
          </Link>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 bg-gray-100 min-h-screen p-8">
          {children}
        </main>

      </div>
    </div>
  );
}