"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Monitor,
  Award,
  LogOut,
  Library,
  FileQuestion,
} from "lucide-react";
import type { AuthUser } from "@/app/lib/portal-api";
import AuthGuard from "@/app/components/AuthGuard";

const navItems = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "NYSC Books", href: "/staff/books", icon: Library },
  { label: "Training", href: "/staff/training", icon: BarChart2 },
  { label: "Test/Exams", href: "/staff/cbt", icon: FileQuestion },
  { label: "Result", href: "/staff/result", icon: Monitor },
  { label: "Certifications", href: "/staff/certifications", icon: Award },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/accounts/me", { cache: "no-store" });

        if (!res.ok) {
          setUser(null);
          return;
        }

        const payload = await res.json();
        setUser(payload?.data ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    void loadUser();
  }, []);

  const handleSignOut = async () => {
    setIsProfileOpen(false);

    await fetch("/api/accounts/auth/logout", {
      method: "POST",
    });

    setUser(null);
    router.replace("/login");
  };

  const isFullScreenView =
    pathname.includes("/staff/course/") ||
    (pathname.includes("/staff/cbt/") && pathname !== "/staff/cbt");

  const displayName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "User"
    : "User";

  const firstName = user?.first_name || "User";

  const userPhoto =
    user?.profile?.profile_picture_url ?? "/1-blank-profile.png";

  if (isFullScreenView) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <header className="h-16 bg-white flex items-center justify-between px-8 fixed top-0 left-60 right-0 z-40 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">
            {loadingUser ? "Welcome…" : `Welcome, ${firstName}`}
          </h1>

          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-[#1a6b3c]">🔔</button>

            <div className="relative">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <Image
                  src={userPhoto}
                  alt={displayName}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />

                <span className="text-sm font-medium text-gray-700">
                  {loadingUser ? "Loading…" : `${displayName} ▾`}
                </span>
              </div>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden py-1 z-50">
                  <Link
                    href="/staff/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition"
                  >
                    Profile
                  </Link>

                  <Link
                    href="/staff/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition"
                  >
                    Settings
                  </Link>

                  <div className="h-px bg-gray-100 my-1" />

                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex pt-16 min-h-screen">
          <aside className="w-60 bg-[#1a6b3c] fixed top-0 left-0 bottom-0 flex flex-col justify-between py-6 px-4 z-50 shadow-xl overflow-y-auto">
            <div>
              <div className="mb-6 px-2 flex flex-col items-center text-center gap-4">
                <Image
                  src="/images/nysc-logo.png"
                  alt="NYSC"
                  width={56}
                  height={56}
                />

                <p className="text-white font-bold text-sm leading-tight">
                  NATIONAL YOUTH SERVICE CORPS
                  <br />
                  STAFF E-TRAINING
                </p>
              </div>

              <div className="w-full h-px bg-white/20 mb-4" />

              <nav className="space-y-1">
                {navItems.map(({ label, href, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-white text-[#1a6b3c] font-semibold"
                          : "text-green-50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          isActive ? "text-[#1a6b3c]" : "text-green-200"
                        }
                      />
                      {label}
                    </Link>
                  );
                })}

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-red-100 w-full mt-4"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </nav>
            </div>

            <div className="bg-black/20 rounded-2xl p-4 text-white text-sm">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mb-2 text-[#1a6b3c] font-bold">
                ?
              </div>
              <p className="font-semibold mb-1">Need help?</p>
              <p className="text-xs text-green-200 mb-3">
                Please contact us for more questions
              </p>
              <button className="w-full border border-white rounded-full py-1.5 text-xs font-medium">
                +234 800 0000 000
              </button>
            </div>
          </aside>

          <main className="ml-60 flex-1 bg-gray-100 min-h-screen p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}