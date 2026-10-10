import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Content-Security-Policy for the production build, injected as a <meta> tag so it applies on any
 * static host without dashboard configuration. It lists exactly what the site loads: its own files,
 * Google Fonts, Razorpay's checkout (script, frame and the API calls it makes) and the LawFilings
 * API. Build-only — the dev server needs inline scripts and a websocket for hot reload.
 *
 * `frame-ancestors` cannot be set from a <meta> tag; clickjacking protection (X-Frame-Options /
 * frame-ancestors) is added as real response headers on the static host — see the header list in
 * SECURITY_HEADERS.md.
 */
function contentSecurityPolicy(apiBase: string): Plugin {
  let apiOrigin = '';
  try {
    apiOrigin = new URL(apiBase).origin;
  } catch {
    // No/invalid API URL at build time — fall back to 'self' only.
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self' https://*.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.razorpay.com",
    "media-src 'self' blob:",
    `connect-src 'self' ${apiOrigin} https://*.razorpay.com`.replace(/\s+/g, ' ').trim(),
    'frame-src https://*.razorpay.com',
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api.razorpay.com",
  ].join('; ');
  return {
    name: 'lawfilings-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), contentSecurityPolicy(env.VITE_API_BASE_URL ?? '')],
    server: {
      host: '127.0.0.1',
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
  };
})
