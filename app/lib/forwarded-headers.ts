import { headers } from "next/headers";

/**
 * Headers that tell Railway's edge/DDoS protection this is a real browser
 * rather than a script. Server-side fetches from the Next.js proxy used to go
 * out with whatever Node's fetch sends by default — no `sec-fetch-*`, a
 * generic (or absent) User-Agent, no Accept-Language — which reads as bot
 * traffic and was getting 429'd. Re-sending the browser's own values on the
 * outbound request fixes that without touching where the request originates.
 */
const FORWARDED_HEADER_NAMES = [
  "user-agent",
  "accept-language",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "referer",
] as const;

/**
 * Reads the browser-identifying headers off the incoming request so a
 * server-side proxy fetch can re-send them to the backend. Safe to call from
 * anywhere in a Route Handler's call chain, same as `cookies()`.
 */
export async function browserHeaders(): Promise<Record<string, string>> {
  const incoming = await headers();
  const forwarded: Record<string, string> = {};

  for (const name of FORWARDED_HEADER_NAMES) {
    const value = incoming.get(name);
    if (value) forwarded[name] = value;
  }

  return forwarded;
}
