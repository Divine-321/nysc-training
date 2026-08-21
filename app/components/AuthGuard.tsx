"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, type AuthUser } from "@/app/lib/portal-api";
import { cachedFetch, invalidate } from "@/app/lib/data-cache";

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

      // Anything that writes empties the read cache. Clearing all of it
      // rather than the one resource is deliberate: edits ripple across
      // endpoints (a question changes its assessment, an enrolment changes
      // a programme's counts), and this app reads far more than it writes,
      // so the cost is one refetch where the alternative is stale screens
      // whenever a dependency is missed.
      const method = (
        init?.method ??
        (typeof input === "object" && "method" in input
          ? input.method
          : "GET")
      ).toUpperCase();

      if (response.ok && method !== "GET" && url.includes("/api/")) {
        invalidate();
      }

      // Login and device verification now call Railway directly (see
      // app/lib/auth-client.ts), so their URL is the backend's own path, not
      // the old "/api/auth/login" proxy route — match on the trailing
      // segment so both the (retired) proxy path and the direct one exempt.
      const shouldLogout =
        response.status === 401 &&
        url.includes("/api/") &&
        !url.includes("/auth/login") &&
        !url.includes("/auth/verify-device") &&
        !url.includes("/auth/logout") &&
        !url.includes("/auth/refresh");

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
        // Cached, unlike the 401 re-check below. The layout requests the same
        // user a moment later, so an uncached call here meant fetching one
        // person twice on every page — and against a slow backend that was
        // several seconds of the wait before anything could render.
        //
        // Safe because failures are never cached: a dead session still reaches
        // the network and still redirects. clearSession() empties the cache on
        // sign-out, so the next account cannot inherit this one.
        const response = await cachedFetch("/api/accounts/me");

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
