"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/app/components/AuthGuard";
import { resolveMediaUrl, type AuthUser } from "@/app/lib/portal-api";

import {
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  BookOpen,
  Layers,
  History,
  Library,
  LogOut,
  Award,
  UserCheck,
  Settings2,
  ShieldCheck,
  Menu,
  X,
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
    label: "Training Programmes",
    href: "/admin/cohorts",
    icon: Layers,
  },
  {
    label: "Staff",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Organization Data",
    href: "/admin/organization-data",
    icon: Settings2,
    superadminOnly: true,
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
    label: "Proctoring",
    href: "/admin/proctoring",
    icon: ShieldCheck,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    label: "Trainers",
    href: "/admin/trainers",
    icon: UserCheck,
    superadminOnly: true,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

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

    const refreshUser = () => {
      void loadUser();
    };

    window.addEventListener("nysc-profile-updated", refreshUser);

    return () => {
      window.removeEventListener("nysc-profile-updated", refreshUser);
    };
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

  const adminPhoto = resolveMediaUrl(user?.profile?.profile_picture_url);

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
        <header className="h-16 bg-white flex items-center justify-between px-4 sm:px-8 fixed top-0 left-0 lg:left-64 right-0 z-40 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsSidebarOpen((current) => !current)}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-green-50 hover:text-[#1a6b3c] lg:hidden"
            >
              {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <h1 className="truncate text-base font-bold text-gray-800 sm:text-xl">
              Admin Portal
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative" ref={profileRef}>
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

                <span className="hidden text-sm font-medium text-gray-700 sm:inline">
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

        <div className="flex pt-16 min-h-screen print:pt-0 print:min-h-0">
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden"
            />
          )}

          <aside
            className={`fixed left-0 top-0 bottom-0 w-64 bg-[#1a6b3c] px-4 py-6 flex flex-col justify-between z-50 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 print:hidden ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div>
              <div className="mb-2 flex items-center justify-end lg:hidden">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-green-100 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

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

          <main className="ml-0 lg:ml-64 flex-1 min-w-0 bg-gray-100 min-h-screen p-4 sm:p-8 print:ml-0 print:min-h-0 print:bg-white print:p-0">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
