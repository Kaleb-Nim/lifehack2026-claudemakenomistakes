import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep screen recordings clean — no dev badge in the corner.
  devIndicators: false,

  // @napi-rs/canvas and pdfjs-dist ship native bindings that Turbopack cannot
  // place in an ESM chunk ("non-ecmascript placeable asset"). lib/thumbnails.ts
  // pulls them in from the /api/upload route, so hand them to Node's require.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
};

export default nextConfig;
