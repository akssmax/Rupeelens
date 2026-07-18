/// <reference types="vitest/config" />
import { defineConfig } from "vite"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.perf.test.ts"],
  },
})
