# NextFlow

NextFlow is a pixel-perfect LLM workflow builder inspired by Krea.ai. It allows users to visually construct, run, and export complex AI workflows using a drag-and-drop canvas.

## 🚀 Status: Phase 0-7 Complete

The core infrastructure and building blocks are fully implemented and verified with strict TypeScript type safety (React Flow v12).

### ✅ What's Done
- **Phase 0-1: Foundation** — Next.js 15+ App Router, Tailwind CSS v4, Clerk Authentication, Krea-inspired Dark Theme.
- **Phase 2: Node UI** — 6 Custom Node types (Text, Upload Image/Video, LLM, Crop, Extract Frame).
- **Phase 3: State Management** — Zustand store with Undo/Redo (zundo), Immer for complex state updates, and DAG-based connection validation.
- **Phase 4-5: Persistence** — Prisma ORM (Neon PostgreSQL), Workflow CRUD API, Auto-save (debounced 1.5s), JSON Export.
- **Phase 6: File Handling** — Transloadit integration for signed image/video uploads with node previews.
- **Phase 7: Execution Core** — Trigger.dev v3 background tasks for LLM (Gemini), Image Cropping (FFmpeg), and Video Frame Extraction (FFmpeg).

### 🛠️ What's Remaining (Phase 8-10)
- **Phase 8: Run History** — Populating the Right Sidebar with previous execution logs and results.
- **Phase 9: Real-time UI Updates** — Pushing execution progress (running/success/error) from background tasks back to the canvas nodes via SSE or polling.
- **Phase 10: Advanced Features** — Workflow templates, node duplication (Ctrl+D), and visual workflow sharing.

---

## 🛠️ Environment Setup

NextFlow requires several external services. Follow these steps to get your `.env.local` ready:

1. **Database:**
   - Create a project at [Neon.tech](https://neon.tech).
   - Copy the Pooled connection string to `DATABASE_URL`.
   - Copy the Direct connection string to `DIRECT_URL`.

2. **Authentication:**
   - Create an application at [Clerk.com](https://dashboard.clerk.com).
   - Copy your Publishable Key and Secret Key.

3. **AI (Gemini):**
   - Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

4. **Background Tasks:**
   - Create a project at [Trigger.dev](https://cloud.trigger.dev).
   - Get your Development Secret Key and Project ID from Settings → API Keys.

5. **File Uploads:**
   - Create an account at [Transloadit.com](https://transloadit.com).
   - Get your API Key and Secret from the credentials page.

### `.env.local` Template
```bash
# Database (Neon)
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/workflows"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/workflows"

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# Trigger.dev
TRIGGER_SECRET_KEY="tr_dev_..."
TRIGGER_PROJECT_ID="proj_..."

# Transloadit
TRANSLOADIT_KEY="..."
TRANSLOADIT_SECRET="..."
```

---

## 🏃 Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Migration:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Start Trigger.dev Worker:**
   ```bash
   npx trigger.dev@latest dev
   ```

4. **Start Next.js App:**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` and sign in to start building!
