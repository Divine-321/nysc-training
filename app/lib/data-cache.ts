/**
 * A short-lived cache for GET requests, so moving between admin pages does not
 * re-download the same reference data every time.
 *
 * Nearly every page is a client component that fetches in an effect, so a
 * navigation used to mean: blank screen, mount, request, wait, render. Lists
 * like programmes, courses and departments are read on a dozen different
 * screens and change rarely, so most of that waiting was spent re-fetching
 * bytes the browser had seconds earlier.
 *
 * Two things are cached here:
 *   - completed responses, for TTL_MS after they arrive
 *   - in-flight requests, so parallel callers share one network round trip
 *     rather than firing the same request several times on one page load
 *
 * Deliberately a plain TTL rather than stale-while-revalidate. Callers get a
 * Response back and are not subscribed to anything, so a background refresh
 * would land after the page had already rendered and be ignored. Freshness
 * comes from a short window plus explicit invalidation after mutations.
 */

// Long enough to cover moving between pages and back, short enough that
// anything missed by an invalidate call corrects itself quickly.
const DEFAULT_TTL_MS = 30_000;

// Reference data that only changes when an admin edits it directly, which
// always goes through invalidate().
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
  options: { ttlMs?: number } = {},
): Promise<Response> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  // No cache on the server: the map would be module-level state shared by
  // every visitor, which is one user seeing another user's data.
  if (typeof window === "undefined") {
    return fetch(url, { cache: "no-store" });
  }

  const fresh = responseCache.get(url);
  if (fresh && Date.now() - fresh.at < ttlMs) {
    return buildResponse(fresh);
  }

  const pending = inFlight.get(url);
  if (pending) {
    return buildResponse(await pending);
  }

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
    // on screen for the whole TTL even after the cause had cleared, and a 401
    // in particular must reach the network again so the session can refresh.
    if (response.ok) {
      responseCache.set(url, entry);
    }

    return entry;
  })();

  inFlight.set(url, request);

  try {
    return buildResponse(await request);
  } finally {
    inFlight.delete(url);
  }
}
