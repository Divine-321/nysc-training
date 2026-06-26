"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, type AuthUser } from "@/app/lib/portal-api";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: readonly AuthUser["role"][];
};

export default function AuthGuard({
  children,
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const shouldLogout =
        response.status === 401 &&
        url.includes("/api/") &&
        !url.includes("/api/auth/login") &&
        !url.includes("/api/accounts/auth/logout") &&
        !url.includes("/api/accounts/auth/refresh");

      if (shouldLogout) {
        const sessionCheck = url.includes("/api/accounts/me")
          ? response
          : await originalFetch("/api/accounts/me", {
              cache: "no-store",
            }).catch(() => null);

        if (!sessionCheck?.ok) {
          clearSession();
          await originalFetch("/api/accounts/auth/logout", {
            method: "POST",
          }).catch(() => null);
          router.replace("/login");
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await fetch("/api/accounts/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const payload = await response.json();
        const user = payload?.data as AuthUser | undefined;

        if (!user) {
          router.replace("/login");
          return;
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
          router.replace(
            user.role === "staff"
              ? "/staff/dashboard"
              : "/admin/dashboard"
          );
          return;
        }

        setChecking(false);
      } catch {
        router.replace("/login");
      }
    };

    void verify();
  }, [allowedRoles, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Checking access...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
