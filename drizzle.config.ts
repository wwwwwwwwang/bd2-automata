import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/shared/src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "./packages/api/wrangler.toml", // 指定任意一个 wrangler.toml 即可
    dbName: "bd2-automata-db",
  },
});
