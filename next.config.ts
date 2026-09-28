import type { NextConfig } from "next";

// When deployed to root organization page (https://cdpruacademy.github.io/), basePath should be empty.
// Can be customized via NEXT_PUBLIC_BASE_PATH if hosted in a sub-directory repo.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
