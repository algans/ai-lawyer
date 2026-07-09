import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    env: { SESSION_SECRET: "test-secret-32-chars-min-aaaaaaaa" },
    // mobile/ Expo projesi kendi testlerini jest ile koşar; backend vitest ona dokunmamalı.
    // Açık exclude vitest'in varsayılan **/node_modules/**'ını ezdiği için burada tekrar veriyoruz.
    exclude: ["e2e/**", "**/node_modules/**", "mobile/**"],
  },
});
