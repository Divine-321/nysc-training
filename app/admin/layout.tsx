"use client";

import Link from "next/link";
import { useState } from "react";
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
  Library,
  User,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Staff", href: "/admin/users", icon: Users },
  { label: "Cohorts", href: "/admin/departments", icon: Layers },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "NYSC Books", href: "/admin/books", icon: Library },
  { label: "Assignments", href: "/admin/assignments", icon: UserRound },
  { label: "Audit Logs", href: "/admin/audit", icon: History },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Mock signed-in admin (Replace with real auth data later)
  const adminName = "Abba Admin";
  const adminRole = "Super Admin";
  const adminInitial = adminName.charAt(0);
  const adminPhoto = "/1-blank-profile.png"; // Assuming you have an admin avatar

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top Header */}
      <header className="h-16 bg-white flex items-center justify-between px-8 fixed top-0 left-64 right-0 z-40 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Admin Portal</h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <Image
                src={adminPhoto}
                alt="Admin User"
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
              <span className="text-sm font-medium text-gray-700">{adminName} ▾</span>
            </div>
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50">
                <Link href="/admin/profile" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">Profile</Link>
                <Link href="/admin/settings" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">Settings</Link>
                <div className="h-px bg-gray-100 my-1"></div>
                <Link href="/login" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">Sign out</Link>
              </div>
            )}
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