# NextFlow — Environment Variables & Setup

## .env.local (complete)

```bash
# ─── Database (Neon PostgreSQL) ───────────────────
# Get from: https://neon.tech → your project → Connection Details
DATABASE_URL="postgres://user:pass@host/nextflow?sslmode=require"
DIRECT_URL="postgres://user:pass@host/nextflow?sslmode=require"
# Note: Neon provides BOTH a pooled URL (DATABASE_URL) and a direct URL (DIRECT_URL)
# Use pooled for app, direct for Prisma migrations

# ─── Clerk Auth ────────────────────────────────────
# Get from: https://dashboard.clerk.com → your app → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/workflows"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/workflows"

# ─── Google Gemini ─────────────────────────────────
# Get from: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# ─── Trigger.dev ───────────────────────────────────
# Get from: https://cloud.trigger.dev → your project → Settings → API Keys
TRIGGER_SECRET_KEY="tr_dev_..."      # dev key for local
TRIGGER_PROJECT_ID="proj_..."        # your project ID
# Note: use tr_prod_... key for production

# ─── Transloadit ───────────────────────────────────
# Get from: https://transloadit.com → API Credentials
TRANSLOADIT_KEY="your-auth-key"
TRANSLOADIT_SECRET="your-auth-secret"
```

## vercel.json (for deployment)

```json
{
  "env": {
    "DATABASE_URL": "@database_url",
    "DIRECT_URL": "@direct_url",
    "CLERK_SECRET_KEY": "@clerk_secret_key",
    "GOOGLE_GENERATIVE_AI_API_KEY": "@google_generative_ai_api_key",
    "TRIGGER_SECRET_KEY": "@trigger_secret_key",
    "TRIGGER_PROJECT_ID": "@trigger_project_id",
    "TRANSLOADIT_KEY": "@transloadit_key",
    "TRANSLOADIT_SECRET": "@transloadit_secret"
  }
}
```

---

## Step-by-Step Setup

### 1. Create Next.js project
```bash
npx create-next-app@latest nextflow \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --no-eslint \
  --import-alias "@/*"

cd nextflow
```

### 2. Install all dependencies
```bash
npm install \
  @clerk/nextjs \
  @prisma/client \
  @google/generative-ai \
  @trigger.dev/sdk \
  @xyflow/react \
  zustand \
  zundo \
  immer \
  zod \
  lucide-react \
  clsx \
  tailwind-merge \
  date-fns \
  @tanstack/react-query \
  execa \
  transloadit

npm install -D \
  @trigger.dev/build \
  prisma \
  @types/node \
  @types/react
```

### 3. Initialize Prisma
```bash
npx prisma init
# Paste the schema from SCHEMA.md into prisma/schema.prisma
npx prisma db push
npx prisma generate
```

### 4. Initialize Trigger.dev
```bash
npx trigger.dev@latest init
# Select: Existing Next.js project
# This creates trigger.config.ts and src/trigger/ directory
```

### 5. Configure middleware
```bash
# Create src/middleware.ts with content from ARCHITECTURE.md
```

### 6. Set up Clerk
```bash
# Go to clerk.com → create application → copy API keys to .env.local
# Create src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:
```
```tsx
import { SignIn } from '@clerk/nextjs'
export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-krea-bg">
      <SignIn />
    </div>
  )
}
```

### 7. Create root layout with ClerkProvider
```tsx
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### 8. Start dev servers
```bash
npm run dev
```

---

## Common Gotchas & Fixes

### React Flow CSS not loading
```tsx
// MUST be in globals.css, NOT in component:
@import '@xyflow/react/dist/style.css';
```

### Prisma Client not found after schema change
```bash
npx prisma generate  # run after every schema change
```

### Clerk auth() returns null in API route
```typescript
// Use auth() from @clerk/nextjs/server (not @clerk/nextjs)
import { auth } from '@clerk/nextjs/server'  // ✓ correct
import { auth } from '@clerk/nextjs'          // ✗ wrong for API routes
```

### Zustand store persisting between hot reloads
```typescript
// The prisma singleton pattern in lib/prisma.ts handles this
// For stores, zustand's devtools resets on full reload automatically
```

### Trigger.dev tasks not found
```typescript
// Tasks MUST be in the dirs specified in trigger.config.ts
// Default is './src/trigger' — all task files must be here
// Task id strings must be unique across the project
```

### React Flow nodes not draggable
```tsx
// Add nodrag class to all interactive elements inside nodes:
<textarea className="nodrag" />
<input className="nodrag" />
<select className="nodrag" />
<button className="nodrag" />
// This prevents React Flow from intercepting drag events on inputs
```

### Handle positions overlapping in LLM node
```tsx
// Use style prop to position handles at different Y offsets:
<Handle style={{ top: '25%' }} type="target" position={Position.Left} id="system_prompt" />
<Handle style={{ top: '50%' }} type="target" position={Position.Left} id="user_message" />
<Handle style={{ top: '75%' }} type="target" position={Position.Left} id="images" />
```

### FFmpeg not available in Trigger.dev
```typescript
// trigger.config.ts needs the build extension:
import { ffmpeg } from '@trigger.dev/build/extensions/core'
export default defineConfig({
  build: {
    extensions: [ffmpeg()],
  },
  // ...
})
```

### Neon connection timeout in development
```
// Use connection pooling URL for DATABASE_URL
// Use direct URL for DIRECT_URL (migrations only)
// Both are available in Neon dashboard
```

---

## Vercel Deployment

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial"
gh repo create nextflow --private
git push -u origin main

# 2. Import to Vercel
# Go to vercel.com → Import → select repo
# Add all environment variables from .env.local

# 3. After deploy, update Trigger.dev for production
npx trigger.dev@latest deploy
# Change TRIGGER_SECRET_KEY in Vercel to tr_prod_... key

# 4. Run Prisma migration on production DB
npx prisma db push  # or migrate deploy for production
```

