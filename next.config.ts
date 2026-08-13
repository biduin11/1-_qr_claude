import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next.js needs 'unsafe-inline' for its own bootstrap/hydration scripts and
// 'unsafe-eval' in dev (HMR). Revisit with a nonce-based policy if this ever
// needs to be tightened further; not required for V1.
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Явно фиксируем корень — иначе Turbopack поднимается по дереву каталогов
  // и может найти посторонний package-lock.json в домашней директории.
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// PWA/офлайн-кэш (ARCHITECTURE.md §9, Iteration 7). Собирается только в
// production build (`next build`, webpack) — `@serwist/next` не поддерживает
// Turbopack, на котором работает `next dev` в этом проекте (см. docker-compose.dev.yml),
// поэтому в dev service worker намеренно отключён (`disable: isDev`), а не
// подключается в урезанном виде. Офлайн-поведение проверяется на production-сборке.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
});

export default withSerwist(nextConfig);
