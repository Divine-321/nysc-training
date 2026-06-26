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
  Bell,
  CheckCheck,
} from "lucide-react";
import { readApiList, type AuthUser } from "@/app/lib/portal-api";
import AuthGuard from "@/app/components/AuthGuard";

type Notification = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type CohortStaffAssignment = {
  id: number;
  cohort: number;
  cohort_name: string;
  staff: number;
};

type CourseEnrollment = {
  id: number;
  cohort_name: string;
};

function normalizeStaffNotificationLink(link: string) {
  try {
    const trimmedLink = link.trim();

    if (!trimmedLink || trimmedLink.toLowerCase().startsWith("javascript:")) {
      return "/staff/dashboard";
    }

    const parsedUrl = new URL(trimmedLink, window.location.origin);
    const pathname = parsedUrl.pathname;
    const suffix = `${parsedUrl.search}${parsedUrl.hash}`;

    if (pathname.startsWith("/staff/")) {
      const staffCoursePluralMatch = pathname.match(
        /^\/staff\/courses\/(\d+)\/?$/,
      );

      if (staffCoursePluralMatch) {
        return `/staff/course/${staffCoursePluralMatch[1]}${suffix}`;
      }

      return `${pathname}${suffix}`;
    }

    const courseMatch =
      pathname.match(/^\/courses\/(\d+)\/?$/) ??
      pathname.match(/^\/course\/(\d+)\/?$/) ??
      pathname.match(/^\/training\/courses\/(\d+)\/?$/) ??
      pathname.match(/^\/api\/training\/courses\/(\d+)\/?$/);

    if (courseMatch) {
      return `/staff/course/${courseMatch[1]}${suffix}`;
    }

    return `${pathname}${suffix}`;
  } catch {
    return link;
  }
}

const navItems = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "NYSC Books", href: "/staff/books", icon: Library },
  { label: "Training", href: "/staff/training", icon: BarChart2 },
  { label: "Test/Exams", href: "/staff/cbt", icon: FileQuestion },
  { label: "Result", href: "/staff/result", icon: Monitor },
  { label: "Certifications", href: "/staff/certifications", icon: Award },
];

const STAFF_ROLES = ["staff"] as const;

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userCohorts, setUserCohorts] = useState<string[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/accounts/me", { cache: "no-store" });

        if (!res.ok) {
          setUser(null);
          return;
        }

        const payload = await res.json();
        const currentUser = payload?.data as AuthUser | null;
        setUser(currentUser);

        if (currentUser) {
          const cohortResponse = await fetch("/api/training/cohort-staff", {
            cache: "no-store",
          });

          if (cohortResponse.ok) {
            const cohortPayload = await cohortResponse.json().catch(() => null);
            const assignments =
              readApiList<CohortStaffAssignment>(cohortPayload);

            setUserCohorts(
              assignments
                .filter((assignment) => assignment.staff === currentUser.id)
                .map((assignment) => assignment.cohort_name),
            );
          } else {
            const enrollmentResponse = await fetch("/api/training/enrollments", {
              cache: "no-store",
            });

            if (enrollmentResponse.ok) {
              const enrollmentPayload = await enrollmentResponse
                .json()
                .catch(() => null);
              const cohortNames = readApiList<CourseEnrollment>(
                enrollmentPayload,
              ).map((enrollment) => enrollment.cohort_name);

              setUserCohorts([...new Set(cohortNames)]);
            }
          }
        }
      } catch {
        setUser(null);
        setUserCohorts([]);
      } finally {
        setLoadingUser(false);
      }
    };

    void loadUser();
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = await response.json();
        const count =
          payload?.data?.unread_count ??
          payload?.data?.count ??
          payload?.unread_count ??
          payload?.count ??
          0;

        setUnreadCount(Number(count));
      } catch {
        setUnreadCount(0);
      }
    };

    void loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    setLoadingNotifications(true);

    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = await response.json();
      setNotifications(readApiList<Notification>(payload));
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });

      if (response.ok) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    }

    setIsNotificationsOpen(false);

    if (notification.link) {
      router.push(normalizeStaffNotificationLink(notification.link));
    }
  };

  const handleMarkAllRead = async () => {
    const response = await fetch("/api/notifications/mark-all-read", {
      method: "POST",
    });

    if (!response.ok) return;

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);

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
  const cohortLabel =
    userCohorts.length > 0 ? userCohorts.join(", ") : "No cohort assigned";

  const userPhoto =
    user?.profile?.profile_picture_url ?? "/1-blank-profile.png";

  if (isFullScreenView) {
    return <AuthGuard allowedRoles={STAFF_ROLES}>{children}</AuthGuard>;
  }

  return (
    <AuthGuard allowedRoles={STAFF_ROLES}>
      <div className="min-h-screen flex flex-col">
        <header className="h-16 bg-white flex items-center justify-between px-8 fixed top-0 left-60 right-0 z-40 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">
            {loadingUser ? "Welcome..." : `Welcome, ${firstName}`}
          </h1>

          <div className="flex items-center gap-4">
            <div className="hidden rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-[#1a6b3c] md:block">
              Cohort: {loadingUser ? "Loading..." : cohortLabel}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Open notifications"
                aria-expanded={isNotificationsOpen}
                onClick={() => {
                  const shouldOpen = !isNotificationsOpen;
                  setIsNotificationsOpen(shouldOpen);
                  setIsProfileOpen(false);

                  if (shouldOpen) void loadNotifications();
                }}
                className="relative rounded-full p-2 text-gray-500 transition hover:bg-green-50 hover:text-[#1a6b3c]"
              >
                <Bell size={21} />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-5 text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-800">Notifications</p>
                      <p className="text-xs text-gray-500">
                        {unreadCount} unread
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllRead()}
                        className="flex items-center gap-1 text-xs font-medium text-[#1a6b3c] hover:underline"
                      >
                        <CheckCheck size={15} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <p className="px-4 py-8 text-center text-sm text-gray-500">
                        Loading notifications...
                      </p>
                    ) : notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-gray-500">
                        You have no notifications.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() =>
                            void handleNotificationClick(notification)
                          }
                          className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 ${
                            notification.is_read ? "bg-white" : "bg-green-50/60"
                          }`}
                        >
                          <div className="flex gap-3">
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                notification.is_read
                                  ? "bg-transparent"
                                  : "bg-[#1a6b3c]"
                              }`}
                            />

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-gray-600">
                                {notification.message}
                              </p>
                              <p className="mt-1 text-[11px] text-gray-400">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
              >
                <Image
                  src={userPhoto}
                  alt={displayName}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />

                <span className="text-sm font-medium text-gray-700">
                  {loadingUser ? "Loading..." : `${displayName} ▾`}
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
