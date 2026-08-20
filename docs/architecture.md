# Architecture

The parts of this codebase that are not obvious from reading it.

## The data model

The backend was restructured in July 2026 and the same concept was renamed
twice, so three words appear for one thing:

```
Cohort Course  →  Training  →  Programme
```

They are the same object. The code still says `CohortCourse`, the API says
`/programmes/`, and the interface says "Training".

### The five pieces

| | What it is | Example |
|---|---|---|
| **Course** | The syllabus. Reusable, no dates, no students. | "Fire Safety" |
| **Module** | A chapter. Lives in a shared library, attached to courses. | "Evacuation Basics" |
| **Activity** | One item inside a module — video, PDF, text, link. | "Assembly Points" |
| **Programme** | One *delivery* of a Course to a Cohort, with dates. | "Fire Safety - August 2026" |
| **Enrollment** | One staff member on one Programme. Holds all progress. | |

```
Course ────< Module >──── Activity
  │             │
  │             └── Assessment (pre-test / post-test)
  │
  └──► Programme  (Course + Cohort + Year + dates)
             │
             └──► Enrollment  ──► Certificate
```

A Course is the recipe. A Programme is one time you cook it. An Enrollment is
one person eating.

**A cohort is no longer a thing you join.** It is a field on a Programme. You
do not add staff to a cohort — you enrol them on a Programme, and the cohort
is part of that Programme's name.

### Naming drift

The code and the API disagree in places, which is a migration leftover rather
than a distinction:

| Code says | API says |
|---|---|
| `documents` | `activities` |
| `CohortCourse` | `Programme` |
| `course_title` | `programme_title` |

`normalizeEnrollment` in `staff-learning.ts` mirrors `programme` onto
`cohort_course` so both spellings work throughout.

## Where progress comes from

**One endpoint.** `GET /api/training/enrollments/` carries everything:

- `completion_percentage` — every progress bar in the app
- `total_steps` / `completed_steps` — the "X of Y" counters
- `summary.overall_completion_percentage` — across all a staff member's courses

`GET /api/training/enrollments/{id}/` additionally returns
`modules_breakdown`, which is per-module progress. It is `null` on the list,
which is why the course page fetches the detail separately.

A step is an **activity, a live session, or a post-test**. That formula changed
in August 2026 — it previously counted activities only, which is why the
frontend used to recalculate percentages itself. It no longer does: two
formulas meant the same course showed different numbers on different screens.

**Anything showing a number should display the backend's, not its own.** The
backend's percentage is what gates certificate issuance, so a screen that
disagrees with it will promise a certificate that never arrives.

## Authentication

Unusual, for a reason.

### Normal requests: browser → our server → Django

Every API call goes through a route handler in `app/api/`, which attaches the
access token and refreshes it when it expires (`api-proxy.ts`).

The tokens live in **httpOnly cookies**. The browser stores and sends them, but
JavaScript cannot read them — so a script injected into the page cannot steal a
session. That protection is the only reason the proxy layer exists.

### Login: browser → Django directly

Login and device verification skip the proxy (`auth-client.ts`).

Railway runs a bot challenge in front of the production backend. It replies
with a page of JavaScript and expects a browser to run it. Our server cannot,
so its requests were refused with 429 while browsers passed. Forwarding browser
headers does not help — the challenge wants JavaScript executed, not headers.

So login runs in the browser, and the tokens it receives are immediately handed
to `POST /api/auth/session`, which writes the same httpOnly cookies as before.
Tokens are in JavaScript for one moment and are never stored there.

**The cost:** the backend's CORS allowlist now decides which addresses can log
in. Every domain — production, localhost, Vercel previews — must be on it.

### Admin device verification

Admin login is device-gated. A device id is generated once and kept in
`localStorage` (`device-id.ts`); an unrecognised device triggers an emailed
code. Trust is stored per **account**, so each admin verifies once per browser,
and `localStorage` is per-origin, so each address counts separately.

## Caching

`data-cache.ts` caches GET responses in memory. Without it, every navigation
re-fetched everything, and the backend is in Amsterdam — roughly 600ms per
round trip from Nigeria before Django does any work.

- Fresh for 60 seconds — served with no network call
- Stale up to 15 minutes — served **immediately**, refreshed in the background
- Older than that — the caller waits

`cachedFetch` returns a real `Response`, so call sites read `.ok`, `.status`
and `.json()` unchanged.

**Freshness comes from invalidation, not the clock.** `AuthGuard` wraps
`window.fetch`, and any successful non-GET clears the whole cache. Clearing
everything rather than one resource is deliberate: edits ripple across
endpoints, and this app reads far more than it writes. `clearSession()` clears
it too, so signing in as a second admin cannot see the first one's data.

Deliberately **not** cached: the Cloudinary upload signature (time-limited),
file downloads, and the two session checks.

## Compatibility layers

Several places try a new endpoint and fall back to an old one — activities vs
module-docs, complete-activity vs complete-document, programmes vs cohorts.

Those fallbacks are now dead: the old endpoints return 404. They can be deleted
once the backend developer confirms the removals are permanent. Each one costs
a wasted request.
