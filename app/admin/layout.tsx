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
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Staff", href: "/admin/users", icon: Users },
  { label: "Departments", href: "/admin/departments", icon: Building2 },
  { label: "Cohorts", href: "/admin/cohorts", icon: Layers },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Assignments", href: "/admin/assignments", icon: UserRound },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white px-5 py-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/images/nysc-logo.png"
              alt="NYSC"
              width={44}
              height={44}
            />

            <div>
              <p className="font-bold text-[#1a6b3c] leading-tight">NYSC</p>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-[#1a6b3c] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl"
        >
          <LogOut size={18} />
          Logout
        </Link>
      </aside>

      <main className="ml-64 min-h-screen">
        <header className="h-16 bg-white px-8 flex items-center justify-between sticky top-0 z-30">
          <h1 className="text-xl font-bold text-[#1a6b3c]">Admin Portal</h1>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Super Admin</span>

            <div className="w-9 h-9 rounded-full bg-[#1a6b3c] text-white flex items-center justify-center text-sm font-bold">
              A
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}