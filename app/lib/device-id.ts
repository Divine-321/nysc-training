const DEVICE_ID_STORAGE_KEY = "nysc-device-id";

/**
 * A stable per-browser identifier the backend uses to recognise trusted admin
 * devices (required on admin logins since the device-verification release).
 *
 * Generated once and kept in localStorage forever: a new value means the
 * backend treats this browser as a new device and emails an OTP, so it must
 * never be regenerated on logout or token expiry.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  const stored = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (stored) return stored;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : // Older browsers (and non-secure contexts) have no randomUUID.
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);

  return generated;
}
