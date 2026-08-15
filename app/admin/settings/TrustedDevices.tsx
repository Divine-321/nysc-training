"use client";

import { useEffect, useState } from "react";
import { Loader2, MonitorSmartphone, Trash2 } from "lucide-react";
import { extractErrorMessage, readApiList } from "@/app/lib/portal-api";
import { useConfirm } from "@/app/components/useConfirm";

type TrustedDevice = {
  id: number;
  user_agent: string | null;
  ip_address: string | null;
  trusted_at: string;
  last_seen_at: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/**
 * Turns a raw user agent into something readable. Deliberately rough — it only
 * has to help someone recognise "my work laptop" versus "a phone I don't own".
 */
const describeDevice = (userAgent: string | null) => {
  if (!userAgent) return "Unknown device";

  const browser =
    /Edg\//.test(userAgent)
      ? "Edge"
      : /OPR\/|Opera/.test(userAgent)
        ? "Opera"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : /Firefox\//.test(userAgent)
              ? "Firefox"
              : "Browser";

  const platform = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown OS";

  return `${browser} on ${platform}`;
};

export default function TrustedDevices() {
  const { confirm, dialog } = useConfirm();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revokingId, setRevokingId] = useState<number | null>(null);
  // Bumped after a revoke to re-run the effect below. Reloading via a
  // dependency rather than an exported loader keeps the fetch defined inside
  // the effect, which is the pattern used across the admin pages.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/accounts/me/devices", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              payload,
              "Could not load your trusted devices.",
            ),
          );
        }

        if (!active) return;

        setDevices(readApiList<TrustedDevice>(payload));
        setError("");
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your trusted devices.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDevices();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const handleRevoke = async (device: TrustedDevice) => {
    const confirmed = await confirm(
      `Revoke ${describeDevice(device.user_agent)}? The next admin sign-in from it will need a fresh email verification code.`,
      { danger: true },
    );
    if (!confirmed) return;

    setRevokingId(device.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/accounts/me/devices/${device.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Could not revoke this device."),
        );
      }

      setNotice("Device revoked.");
      setReloadToken((token) => token + 1);
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Could not revoke this device.",
      );
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <MonitorSmartphone size={20} className="text-[#1a6b3c]" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Trusted devices</h2>
          <p className="text-sm text-gray-500">
            Browsers that can sign in without an email verification code.
            Revoke any you don&apos;t recognise or no longer use.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={15} className="animate-spin" />
          Loading devices...
        </p>
      ) : devices.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500">
          No trusted devices yet. One is added each time you verify a new
          browser with an emailed code.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {describeDevice(device.user_agent)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {device.ip_address ? `IP ${device.ip_address} · ` : ""}
                  Trusted {formatDate(device.trusted_at)} · Last used{" "}
                  {formatDate(device.last_seen_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRevoke(device)}
                disabled={revokingId === device.id}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {revokingId === device.id ? "Revoking..." : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {dialog}
    </section>
  );
}
