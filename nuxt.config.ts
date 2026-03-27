import tailwindcss from "@tailwindcss/vite";
import packageJson from "./package.json";

// Build-time validation: ensure critical NUXT_PUBLIC_* env vars are set.
// These get baked into the client bundle — if missing at build time, they'll be empty strings in production.
const REQUIRED_PUBLIC_ENV = [
  "NUXT_PUBLIC_SUPABASE_URL",
  "NUXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

if (
  process.env.NODE_ENV === "production" ||
  process.env.NUXT_BUILD_VALIDATE === "1"
) {
  const missing = REQUIRED_PUBLIC_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[Build] Missing required env vars (these get baked into the client bundle):\n` +
        missing.map((k) => `  - ${k}`).join("\n") +
        `\nSet them as Build Environment Variables in Cloudflare Pages dashboard.`,
    );
  }
}

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devServer: {
    port: 9358,
  },
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      appVersion: packageJson.version,
      buildTime: new Date().toISOString(),
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || "https://saasrevenuedb.com",
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
  },
  css: ["./app/assets/css/main.css"],
  app: {
    head: {
      title: "SaaSRevenueDB — The Open SaaS Revenue Database",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Discover SaaS markets, verified MRR data, and founder insights. Open-source intelligence for indie hackers. Free forever.",
        },
        { name: "theme-color", content: "#10b981" },
        { name: "msapplication-TileColor", content: "#10b981" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "SaaSRevenueDB" },
        { property: "og:url", content: "https://saasrevenuedb.com" },
        {
          property: "og:title",
          content: "SaaSRevenueDB — The Open SaaS Revenue Database",
        },
        {
          property: "og:description",
          content:
            "Discover SaaS markets, verified MRR data, and founder insights. Open-source intelligence for indie hackers. Free forever.",
        },
        {
          property: "og:image",
          content: "https://saasrevenuedb.com/og-image.png",
        },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:type", content: "image/png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@ntay_dev" },
        { name: "twitter:url", content: "https://saasrevenuedb.com" },
        {
          name: "twitter:title",
          content: "SaaSRevenueDB — The Open SaaS Revenue Database",
        },
        {
          name: "twitter:description",
          content:
            "Discover SaaS markets, verified MRR data, and founder insights. Open-source intelligence for indie hackers. Free forever.",
        },
        {
          name: "twitter:image",
          content: "https://saasrevenuedb.com/og-image.png",
        },
      ],
      script: [
        ...(process.env.NUXT_PUBLIC_CF_ANALYTICS_TOKEN
          ? [
              {
                src: "https://static.cloudflareinsights.com/beacon.min.js",
                defer: true,
                "data-cf-beacon": `{"token": "${process.env.NUXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`,
              },
            ]
          : []),
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          sizes: "96x96",
          href: "/favicon-96x96.png",
        },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "canonical", href: "https://saasrevenuedb.com" },
        {
          rel: "alternate",
          hreflang: "en",
          href: "https://saasrevenuedb.com",
        },
        {
          rel: "alternate",
          hreflang: "x-default",
          href: "https://saasrevenuedb.com",
        },
        {
          rel: "dns-prefetch",
          href: "https://unavatar.io",
        },
        {
          rel: "preconnect",
          href: "https://unavatar.io",
        },
      ],
    },
    pageTransition: { name: "page", mode: "out-in" },
  },
  modules: ["@pinia/nuxt", "@nuxt/eslint"],
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    preset: "cloudflare-pages",
    prerender: {
      autoSubfolderIndex: false,
    },
  },
  routeRules: {
    "/data/**": {
      headers: { "cache-control": "public, max-age=300, must-revalidate" },
    },
  },
  typescript: {
    typeCheck: true,
  },
});
