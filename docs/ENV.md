# Environment Setup

## .env.local

```bash
# Database
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/workflows"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/workflows"

# Gemini
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Trigger.dev
TRIGGER_SECRET_KEY="tr_dev_..."
TRIGGER_PROJECT_ID="proj_..."

# Transloadit
TRANSLOADIT_KEY="..."
TRANSLOADIT_SECRET="..."

# Local FFmpeg (Windows)
# FFMPEG_PATH="C:\\Users\\<you>\\tools\\ffmpeg-...\\bin\\ffmpeg.exe"
# FFPROBE_PATH="C:\\Users\\<you>\\tools\\ffmpeg-...\\bin\\ffprobe.exe"
```

## Start App

```bash
npm install
npx prisma db push
npm run dev
```

## Production

- Add all env vars in Vercel Project Settings.
- Switch `TRIGGER_SECRET_KEY` to `tr_prod_...`.
- Deploy tasks with:

```bash
npx trigger.dev@latest deploy
```

## Runtime Notes

- Trigger worker needs FFmpeg available at runtime for crop/extract tasks.
- Local Windows can use `FFMPEG_PATH` + `FFPROBE_PATH`.
- Production Trigger worker uses build extension from `trigger.config.ts` and does not require Windows paths.
