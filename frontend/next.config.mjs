/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const STATIC_EXPORT = process.env.STATIC_EXPORT === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = STATIC_EXPORT
  ? {
      // GitHub Pages：純靜態輸出，資料由 CI 產生的 /data/*.json 提供
      reactStrictMode: true,
      output: "export",
      basePath: BASE_PATH,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      reactStrictMode: true,
      // 本機 / 伺服器模式：/api/v1/* 由 Next 代理到 FastAPI，瀏覽器端沒有 CORS 問題
      async rewrites() {
        return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
      },
    };

export default nextConfig;
