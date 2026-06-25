"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/app/components/AuthGuard";
import type { AuthUser } from "@/app/lib/portal-api";

import {
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  Layers,
  History,
  Library,
  LogOut,
  Award,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Courses",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    label: "Cohorts",
    href: "/admin/cohorts",
    icon: Layers,
  },
  {
    label: "Staff",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "NYSC Books",
    href: "/admin/books",
    icon: Library,
  },
  {
    label: "Certificates",
    href: "/admin/certificates",
    icon: Award,
  },
  {
    label: "Invite Admin",
    href: "/admin/invite",
    icon: UserPlus,
    superadminOnly: true,
  },
  {
    label: "Audit Logs",
    href: "/admin/audit",
    icon: History,
    superadminOnly: true,
  },
];

const ADMIN_ROLES = ["admin", "superadmin"] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isInviteAcceptancePage = pathname === "/admin/accept-invite";

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (isInviteAcceptancePage) return;

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
  }, [isInviteAcceptancePage]);

  const handleSignOut = async () => {
    setIsProfileOpen(false);

    await fetch("/api/accounts/auth/logout", {
      method: "POST",
    });

    setUser(null);
    router.replace("/login");
  };

  const displayName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Admin"
    : "Admin";

  const adminPhoto =
    user?.profile?.profile_picture_url ?? "/1-blank-profile.png";

  const visibleNavItems = navItems.filter(
    (item) =>
      !item.superadminOnly || user?.role === "superadmin"
  );

  if (isInviteAcceptancePage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard allowedRoles={ADMIN_ROLES}>
      <div className="min-h-screen flex flex-col">
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
                    href="/admin/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1a6b3c] transition"
                  >
                    Profile
                  </Link>

                  <Link
                    href="/admin/settings"
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
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1a6b3c] px-4 py-6 flex flex-col justify-between z-50 shadow-xl">
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
                  ADMIN PORTAL
                </p>
              </div>

              <div className="w-full h-px bg-white/20 mb-4" />

              <nav className="space-y-1">
                {visibleNavItems.map(({ label, href, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);

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
                      <Icon
                        size={18}
                        className={
                          active ? "text-[#1a6b3c]" : "text-green-200"
                        }
                      />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-white/10 hover:text-red-100 w-full mt-4 transition"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </aside>

          <main className="ml-64 flex-1 bg-gray-100 min-h-screen p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
