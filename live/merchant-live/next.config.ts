import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep screen recordings clean — no dev badge in the corner.
  devIndicators: false,

  // @napi-rs/canvas and pdfjs-dist ship native bindings that Turbopack cannot
  // place in an ESM chunk ("non-ecmascript placeable asset"). lib/thumbnails.ts
  // pulls them in from the /api/upload route, so hand them to Node's require.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],

  // app/api/realtime/session/route.ts reads lib/agent-context.md from process.cwd() at
  // request time, and lib/thumbnails.ts reads pdfjs's standard_fonts/ the same way. Neither
  // is an import, so tracing cannot see them — without these entries both files are absent
  // from the deployed bundle and the routes fail (the agent mints with "no_context").
  outputFileTracingIncludes: {
    "/api/realtime/session": ["./lib/agent-context.md"],
    "/api/upload": ["./node_modules/pdfjs-dist/standard_fonts/**"],
  },
};

export default nextConfig;
