"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  extractErrorMessage,
  type AuthUser,
} from "@/app/lib/portal-api";
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

    // A page that fires several requests at once (a Promise.all of a few
    // endpoints, which most admin/staff pages do) used to make every single
    // one of them run its own separate "confirm the session is really dead,
    // then log out" sequence when the session had expired — each with its
    // own /api/accounts/me round trip, each behind its own failed token
    // refresh attempt server-side. Three near-simultaneous 401s meant three
    // times the wait for the same answer. These two let every 401 after the
    // first one just wait on the one confirmation and one logout already
    // in flight, rather than repeating both.
    let loggingOut = false;
    let sessionCheckPromise: Promise<Response | null> | null = null;

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

      if (shouldLogout && !loggingOut) {
        // The first 401 to arrive starts the one confirmation call; any
        // other request that also 401s while it's in flight reuses the same
        // promise instead of firing its own.
        if (!sessionCheckPromise) {
          sessionCheckPromise = url.includes("/api/accounts/me")
            ? Promise.resolve(response)
            : originalFetch("/api/accounts/me", {
                cache: "no-store",
              }).catch(() => null);
        }

        const sessionCheck = await sessionCheckPromise;

        if (!sessionCheck?.ok && !loggingOut) {
          loggingOut = true;

          // The backend now says exactly why (e.g. idle timeout, 15 minutes
          // for staff / 10 for admin) — carry that through to the login page
          // instead of redirecting silently and leaving the person to wonder
          // why they were signed out. Cloned because sessionCheck may be the
          // same Response this fetch is about to return to its real caller,
          // whose own .json() must still work.
          let reason = "";
          try {
            const payload = await sessionCheck?.clone().json();
            reason = extractErrorMessage(payload, "");
          } catch {
            reason = "";
          }

          clearSession();
          // Not the real logout route: the backend already considers this
          // session dead (that's what the 401 means), so asking it to log
          // out again is a wasted round trip. This only clears our own
          // cookies — see the route for why.
          await originalFetch("/api/accounts/auth/clear-session", {
            method: "POST",
          }).catch(() => null);
          router.replace(
            reason ? `/login?reason=${encodeURIComponent(reason)}` : "/login",
          );
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  // A tab left alone (computer sleeps, browser sits in the background) never
  // makes a request on its own, so nothing ever notices the backend has
  // since expired the session — the screen just keeps showing whatever was
  // last rendered, looking perfectly logged in. This doesn't track idle time
  // itself; it just asks the backend again the moment the tab is actually
  // looked at, through the exact same check and logout path above (this
  // fetch is intercepted by the patched window.fetch from that effect, so
  // there's no separate logic to keep in sync).
  useEffect(() => {
    const checkOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      void window.fetch("/api/accounts/me", { cache: "no-store" }).catch(() => {});
    };

    document.addEventListener("visibilitychange", checkOnReturn);
    window.addEventListener("focus", checkOnReturn);

    return () => {
      document.removeEventListener("visibilitychange", checkOnReturn);
      window.removeEventListener("focus", checkOnReturn);
    };
  }, []);

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
