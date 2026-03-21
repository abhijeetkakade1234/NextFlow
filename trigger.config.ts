// trigger.config.ts
import { defineConfig } from '@trigger.dev/sdk/v3'
import { ffmpeg } from '@trigger.dev/build/extensions/core'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  maxDuration: 300,
  build: {
    extensions: [ffmpeg()],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ['./src/trigger'],
})
