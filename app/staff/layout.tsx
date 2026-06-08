"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Monitor, Award, LogOut, Library, FileQuestion, User } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "NYSC Books", href: "/staff/books", icon: Library },
  { label: "Training", href: "/staff/training", icon: BarChart2 },
  { label: "Test/Exams", href: "/staff/cbt", icon: FileQuestion },
  { label: "Result", href: "/staff/result", icon: Monitor },
  { label: "Certifications", href: "/staff/certifications", icon: Award },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isFullScreenView = pathname.includes("/staff/course/") || (pathname.includes("/staff/cbt/") && pathname !== "/staff/cbt");
  
  if (isFullScreenView) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top Header */}
      <header className="h-16 bg-white flex items-center justify-between px-8 fixed top-0 left-60 right-0 z-40 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Welcome, User</h1>
        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-[#1a6b3c]">
            🔔
          </button>
          <div className="relative">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <Image
                src="/1-blank-profile.png"
                alt="User"
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
              <span className="text-sm font-medium text-gray-700">User ▾</span>
            </div>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50">
                <Link href="/staff/profile" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">
                  Profile
                </Link>
                <Link href="/staff/settings" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition">
                  Settings
                </Link>
                <div className="h-px bg-gray-100 my-1"></div>
                <Link href="/login" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">
                  Sign out
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-16 min-h-screen">

        {/* Sidebar */}
        <aside className="w-60 bg-[#1a6b3c] fixed top-0 left-0 bottom-0 flex flex-col justify-between py-6 px-4 z-50 shadow-xl overflow-y-auto">
          <div>
            {/* Brand */}
            <div className="mb-6 px-2 flex flex-col items-center text-center gap-4">
              <Image src="/images/nysc-logo.png" alt="NYSC" width={56} height={56} />
              <p className="text-white font-bold text-sm leading-tight">
                NATIONAL YOUTH SERVICE CORPS<br />STAFF E-TRAINING
              </p>
            </div>

            <div className="w-full h-px bg-white/20 mb-4" />

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-white text-[#1a6b3c] font-semibold" : "text-green-50 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Icon size={18} className={isActive ? "text-[#1a6b3c]" : "text-green-200"} />
                    {label}
                  </Link>
                );
              })}

              <Link
                href="/login"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-red-100 w-full mt-4"
              >
                <LogOut size={18} />
                Sign out
              </Link>
            </nav>
          </div>

          {/* Help Card */}
          <div className="bg-black/20 rounded-2xl p-4 text-white text-sm">
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