# Security headers for the static site

The Content-Security-Policy that restricts what the site may load is built into `index.html` as a
`<meta>` tag at build time (see `vite.config.ts`), so it needs no host configuration. A meta tag
cannot carry some protections, so these **response headers** are set on the static host.

In Render: **lawfilings-frontend → Settings → Headers → Add header**, path `/*` for each:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=()` |

(`X-Content-Type-Options: nosniff` is already sent by the host.) The extra `Content-Security-Policy`
header only adds `frame-ancestors`; browsers combine it with the policy in the page.

`microphone=(self)` is deliberate: the dictation button uses the browser's speech recognition.

## When to change the policy
- **Another outside service** (analytics, a chat widget, a new payment provider): add its origins to
  `contentSecurityPolicy()` in `vite.config.ts` — scripts to `script-src`, API calls to
  `connect-src`, frames to `frame-src`, images to `img-src`.
- **The API moves** to another host: nothing to edit — `connect-src` is derived from
  `VITE_API_BASE_URL` at build time.
- A blocked resource shows in the browser console as "Refused to … because it violates the
  following Content Security Policy directive".
