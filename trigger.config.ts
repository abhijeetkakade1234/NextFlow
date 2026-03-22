// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv(); // fallback to .env if present

const triggerProjectId = process.env.TRIGGER_PROJECT_ID;
const resolvedProjectId =
  triggerProjectId || process.env.TRIGGER_PROJECT_REF;

if (!resolvedProjectId) {
  throw new Error(
    "Missing Trigger project ref. Set TRIGGER_PROJECT_ID (or TRIGGER_PROJECT_REF) in your environment."
  );
}

export default defineConfig({
  project: resolvedProjectId,
  maxDuration: 300,
  dirs: ["src/trigger"],
  build: {
    extensions: [ffmpeg()],
  },
});
