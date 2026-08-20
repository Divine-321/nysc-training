# Operations

How the deployed system fits together, and what to check when it misbehaves.

## Environments

There are **two Vercel projects from this one repository**, each pointing at a
different backend. Pushing to `main` deploys both.

| | Testing | Production |
|---|---|---|
| Site | `nysc-training.vercel.app` | `training.nysc.gov.ng` |
| Backend | `web-test-1393.up.railway.app` | `web-production-4bf85.up.railway.app` |
| Data | Test data — safe to break | **Real staff records** |

The backend is chosen by `NEXT_PUBLIC_API_BASE_URL`, set per project in
Vercel's environment variables.

> `NEXT_PUBLIC_*` variables are baked in **at build time**. Changing one has no
> effect until the project is redeployed.

A third backend, `web-production-84896`, is retired. Do not point anything at
it. It is still referenced by the `gen:types` script, which should be updated.

## Function region

Both projects should run their functions in **Frankfurt (`fra1`)**, set under
**Settings → Functions → Function Region**, and it only applies to deployments
made after the change.

The default is Washington DC, which meant every API call travelled Nigeria →
US → Amsterdam → back, crossing the Atlantic twice. Frankfurt is closer to both
ends.

To check which region is serving: open the site, **F12 → Network**, click any
request to your own domain, and read `x-vercel-id` in the response headers. The
middle segment is the region — `cpt1::fra1::…` is correct, `cpt1::iad1::…`
means the change has not taken.

## Performance

The backend is in Amsterdam (`x-railway-edge: ams1`); its users are in Nigeria.
A round trip costs roughly **600ms before Django does any work**. That is the
dominant cost in the whole system and no frontend change can remove it.

What has been done about it:

- Search and pagination happen server-side — lists are no longer downloaded whole
- GET responses are cached between navigations (see architecture)
- Route loading files let Next prefetch dynamic routes
- Functions moved to Frankfurt

What would help most, in order: moving the backend to a region nearer Nigeria,
then server-rendering the main pages.

## Known issues

### Railway bot protection on production

Railway serves a Cloudflare Turnstile challenge in front of the production
backend. A browser passes it; a server cannot.

This is why login runs in the browser rather than through our server. It also
means any **server-side** call to production can be refused with a plain-text
`429 rate limited` and no `x-railway-request-id` header — the marker that a
request never reached Django.

To confirm the challenge is present:

```
curl -H 'Accept: text/html' https://web-production-4bf85.up.railway.app/api/docs/
```

Returning "Checking your browser…" rather than the API docs means it is on.

### The CORS allowlist

Because login runs in the browser, every address must be permitted by the
backend, including `http://localhost:3000` and Vercel preview URLs. A login
failing with "Failed to fetch" and nothing in the network tab is almost always
this.

### Diagnosing a backend error

The browser only ever sees a status code — our proxy deliberately does not
forward Django tracebacks to users. To see the real error, reproduce it in
Swagger, which talks to Django directly:

1. Open the backend's `/api/docs/`
2. `POST /api/accounts/auth/login/`, copy the `access` token
3. **Authorize** at the top of the page, paste the token
4. Run the failing request

Never paste tokens into chat or tickets — a refresh token is valid for 24 hours
and is a working key to that account.

## When something breaks

| Symptom | Look at |
|---|---|
| No courses, no cohort, no admin assignments | `/api/training/enrollments/` — everything reads it |
| Certificates fine but nothing else | Same. Certificates come from a different endpoint |
| Login "Failed to fetch" | CORS allowlist on the backend |
| Login 429 on production | Railway bot protection |
| A change is not live | Vercel deployment status; `NEXT_PUBLIC_*` needs a rebuild |
| Region change not applied | Redeploy — the region is fixed at build time |

## Handover checklist

Items only the current owners can answer. **Fill these in before handover.**

- [ ] Who owns the Vercel account long-term?
- [ ] Vercel plan — the free tier prohibits commercial use, which a government
      portal is. Needs resolving.
- [ ] Who at NYSC controls DNS for `nysc.gov.ng`?
- [ ] Should the GitHub repository be private?
- [ ] Who maintains the backend after handover?
- [ ] Support contact numbers — see `app/lib/support-contacts.ts`, currently
      empty, and the help panels stay hidden until it is filled in.
- [ ] Where are admin credentials and the Cloudinary account recorded?
