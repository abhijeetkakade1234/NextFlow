// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv(); // fallback to .env if present

const triggerProjectId = process.env.TRIGGER_PROJECT_ID;
if (!triggerProjectId) {
  throw new Error("Missing required environment variable: TRIGGER_PROJECT_ID");
}

export default defineConfig({
  project: triggerProjectId,
  maxDuration: 300,
  dirs: ["src/trigger"],
  build: {
    extensions: [ffmpeg()],
  },
});
