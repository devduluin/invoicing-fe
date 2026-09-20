/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Dev only: the PDF renderer opens the app via 127.0.0.1, which Next 16 otherwise
  // treats as a cross-origin dev client and blocks.
  allowedDevOrigins: ["127.0.0.1"],
  // Playwright launches a browser process and loads its driver dynamically —
  // keep it out of the bundle and make sure the standalone trace ships it.
  serverExternalPackages: ["playwright", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./node_modules/playwright/**/*", "./node_modules/playwright-core/**/*"],
  },
};

module.exports = nextConfig;
