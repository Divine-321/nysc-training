"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/app/lib/portal-api";

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