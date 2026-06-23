"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const response = await fetch("/api/accounts/me", { cache: "no-store" });

      if (!response.ok) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    };

    void verify();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Checking authentication…</p>
      </div>
    );
  }

  return <>{children}</>;
}