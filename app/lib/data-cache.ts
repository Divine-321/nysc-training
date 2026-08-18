/**
 * A cache for GET requests, so moving between pages does not re-download data
 * the browser already has.
 *
 * Nearly every page is a client component that fetches in an effect, so a
 * navigation means: blank screen, mount, request, wait, render. The backend is
 * in Amsterdam and its users are in Nigeria, where a round trip costs roughly
 * 600ms before Django does any work, so a page making four calls could not
 * feel quick no matter how the requests were arranged. The cheapest request is
 * the one that is never made.
 *
 * Three things happen here:
 *   - fresh responses are served without touching the network
 *   - stale ones are served immediately and refreshed in the background, so a
 *     revisit is instant and the next visit shows the newer data
 *   - concurrent callers of the same URL share one request, instead of each
 *     component on a page firing its own
 *
 * Serving stale content is safe because freshness comes from invalidation
 * rather than from a short window: every successful write clears this cache
 * (see AuthGuard), so an entry can only lag behind if someone else changed the
 * data on another machine.
 */

// How long a response is served with no network call at all.
const DEFAULT_TTL_MS = 60_000;

// Beyond the TTL an entry is still handed straight back, but a refresh starts
// in the background. Past this it is too old to show and the caller waits.
const DEFAULT_STALE_MS = 15 * 60_000;

// Reference data - states, departments, ranks - which only changes when an
// admin edits it directly, and that always invalidates.
export const LONG_TTL_MS = 5 * 60_000;

type CacheEntry = {
  at: number;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};

const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CacheEntry>>();

const buildResponse = (entry: CacheEntry) =>
  new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });

/**
 * Drops cached entries whose URL contains `match`, or the whole cache when
 * called with no argument.
 *
 * Call this after anything that writes, with a fragment of the affected path
 * (`invalidate("/api/training/courses")`). Matching on a substring means one
 * call also clears that resource's list, detail and query-string variants.
 */
export function invalidate(match?: string) {
  if (!match) {
    responseCache.clear();
    inFlight.clear();
    return;
  }

  for (const key of [...responseCache.keys()]) {
    if (key.includes(match)) responseCache.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.includes(match)) inFlight.delete(key);
  }
}

/**
 * Drop-in replacement for `fetch(url, { cache: "no-store" })` on GETs.
 *
 * Returns a real Response, so calling code keeps reading `.ok`, `.status` and
 * `.json()` exactly as before — only the word `fetch` changes at the call site.
 */
export async function cachedFetch(
  url: string,
  options: { ttlMs?: number; staleMs?: number } = {},
): Promise<Response> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const staleMs = options.staleMs ?? Math.max(DEFAULT_STALE_MS, ttlMs);

  // No cache on the server: the map would be module-level state shared by
  // every visitor, which is one user seeing another user's data.
  if (typeof window === "undefined") {
    return fetch(url, { cache: "no-store" });
  }

  const load = () => {
    const pending = inFlight.get(url);
    if (pending) return pending;

    const request = (async (): Promise<CacheEntry> => {
      const response = await fetch(url, { cache: "no-store" });
      const entry: CacheEntry = {
        at: Date.now(),
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body: await response.text(),
      };

      // Only successes are worth keeping. Caching a failure would pin an error
      // on screen for the whole window even after the cause had cleared, and a
      // 401 in particular must reach the network so the session can refresh.
      if (response.ok) {
        responseCache.set(url, entry);
      } else {
        responseCache.delete(url);
      }

      return entry;
    })().finally(() => {
      inFlight.delete(url);
    });

    inFlight.set(url, request);
    return request;
  };

  const cached = responseCache.get(url);

  if (cached) {
    const age = Date.now() - cached.at;

    if (age < ttlMs) {
      return buildResponse(cached);
    }

    if (age < staleMs) {
      // Hand back what we have and refresh behind it. The caller has already
      // rendered by the time the new copy lands, so it is not shown until the
      // next visit - which is the trade that keeps navigation instant.
      void load().catch(() => {
        // A failed background refresh leaves the existing entry in place; the
        // next call retries.
      });
      return buildResponse(cached);
    }
  }

  return buildResponse(await load());
}
