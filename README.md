<h1 align="center">MyBuddy-Admin-Panel</h1>

<p align="center">
  <strong>Web-based admin panel and API for managing on-device AI model catalogs consumed by the MyBuddy mobile application.</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> &bull;
  <a href="#related-repositories">Related Repositories</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#project-layout">Project Layout</a> &bull;
  <a href="#requirements">Requirements</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#admin-dashboard">Admin Dashboard</a> &bull;
  <a href="#authentication">Authentication</a> &bull;
  <a href="#data-storage">Data Storage</a> &bull;
  <a href="#schema-reference">Schema Reference</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#troubleshooting">Troubleshooting</a> &bull;
  <a href="#license">License</a>
</p>

---

## Overview

MyBuddy-Admin-Panel is the model catalog service for the MyBuddy ecosystem. It replaces the previous static GitHub-hosted JSON files (`MyBuddy-cfg`) with a proper admin panel and API server.

The panel serves two roles:

1. **Public JSON API** -- unauthenticated endpoints that the MyBuddy Flutter app calls at runtime to discover downloadable LLM and STT models, their download URLs, file sizes, and inference configurations.

2. **Admin dashboard** -- a key-protected web UI for managing model catalog entries through a table view, form modals, raw JSON editing, and import/export workflows.

There is no database. Model metadata is persisted as flat JSON files on disk with atomic writes, keeping the system lightweight and easy to deploy.

---

## Related Repositories

This admin panel is part of the MyBuddy product surface:

- **Flutter app**: https://github.com/newnonsick/MyBuddy
- **Unity avatar runtime**: https://github.com/newnonsick/MyBuddy-Unity
- **Model catalog admin panel**: https://github.com/newnonsick/MyBuddy-Admin-Panel

The Flutter app fetches `GET /api/llm_models` and `GET /api/stt_models` from this service to populate its Settings model list and drive model downloads.

---

## Features

- public cached REST endpoints for LLM and STT model metadata
- admin dashboard with table view and raw JSON editor
- CRUD operations for model entries via form modals
- import and export model catalogs as JSON files
- Zod schema validation on all admin writes
- atomic file writes with path traversal protection
- single shared admin key authentication with 404 masking
- payload size limits and string sanitization
- responsive UI with glassmorphism navigation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 |
| Notifications | Sonner |
| Storage | File-system JSON / Vercel Blob |

---

## Project Layout

```text
data/
  llm_models.json              Live LLM model registry (gitignored)
  stt_models.json              Live STT model registry (gitignored)
  llm_models.example.json      Committed example data
  stt_models.example.json      Committed example data

src/
  middleware.ts                Auth gate for /admin and /api/admin routes
  lib/
    file-storage.ts            Atomic JSON read/write with path traversal protection
    security.ts                Admin key validation, payload size checks, sanitization
    validation.ts              Zod schemas for LLM and STT model data
  types/
    llm-models.ts              TypeScript interfaces for LLM models
    stt-models.ts              TypeScript interfaces for STT models
  app/
    page.tsx                   Public landing page (API directory)
    layout.tsx                 Root layout with Sonner toaster
    admin/
      page.tsx                 Admin page shell with Suspense boundary
      AdminPageContent.tsx     Full admin dashboard (client component)
    api/
      llm_models/route.ts      GET /api/llm_models (public, cached)
      stt_models/route.ts      GET /api/stt_models (public, cached)
      admin/
        update-llm-models/route.ts   POST (auth-protected)
        update-stt-models/route.ts   POST (auth-protected)
  components/
    AdminNav.tsx               Sticky navigation bar
    ModelTable.tsx             Generic data table with dot-path column accessors
    JsonEditor.tsx             Raw JSON editor with line numbers and formatting
    LlmModelFormModal.tsx      Form modal for LLM model create/edit
    SttModelFormModal.tsx      Form modal for STT model create/edit
    ConfirmDialog.tsx          Reusable confirmation dialog
    SaveButton.tsx             Save button with loading/success/error states
```

---

## Requirements

- Node.js 18 or later
- npm, yarn, pnpm, or bun

No database, external services, or additional infrastructure required.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/newnonsick/MyBuddy-Admin-Panel.git
cd MyBuddy-Admin-Panel
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and set your admin key:

```bash
cp env.example .env.local
```

Edit `.env.local`:

```
ADMIN_KEY=your_secret_admin_key_here
```

If `ADMIN_KEY` is not set, the admin panel and admin API endpoints return 404 and are effectively disabled.

### 4. Seed Example Data

Copy the example catalog files to create your initial data:

```bash
cp data/llm_models.example.json data/llm_models.json
cp data/stt_models.example.json data/stt_models.json
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page.

Open [http://localhost:3000/admin?key=your_secret_admin_key_here](http://localhost:3000/admin?key=your_secret_admin_key_here) for the admin dashboard.

---

## API Reference

### Public Endpoints

These endpoints are consumed by the MyBuddy Flutter app and require no authentication.

#### `GET /api/llm_models`

Returns the full array of LLM model metadata.

#### `GET /api/stt_models`

Returns the full array of STT model metadata.

### Admin Endpoints

These endpoints require the `x-admin-key` header matching the `ADMIN_KEY` environment variable.

#### `POST /api/admin/update-llm-models`

Replaces the entire LLM model catalog.

- Request body: JSON array of LLM model objects
- Validates against `llmModelsSchema` (Zod)
- Rejects payloads over 1 MB
- Returns `Cache-Control: no-store`

#### `POST /api/admin/update-stt-models`

Replaces the entire STT model catalog with the same behavior as the LLM endpoint.

---

## Admin Dashboard

Access the dashboard at `/admin?key=<ADMIN_KEY>`.

### Features

- **Tab navigation** between LLM Models and STT Models
- **Table view** with structured columns, boolean badges, number formatting, and truncated long strings
- **JSON view** with a raw JSON editor featuring line numbers, syntax validation, and format button
- **Add model** via form modals with all required fields
- **Edit model** via pre-populated form modals
- **Delete model** with confirmation dialog
- **Import** model catalogs from JSON files
- **Export** current catalog to JSON file download
- **Save** persists changes immediately to the admin API

Every add, edit, and delete operation immediately saves through the API. Toast notifications provide feedback for success and error states.

---

## Authentication

Authentication uses a single shared `ADMIN_KEY` environment variable.

### How It Works

The Next.js middleware intercepts all requests to `/admin` and `/api/admin/*`:

- **Admin page** (`/admin`): validates the `?key=` query parameter
- **Admin API** (`/api/admin/*`): validates the `x-admin-key` request header

Unauthorized requests receive a **404 response** (not 401 or 403), deliberately hiding the existence of admin routes from unauthorized users.

If `ADMIN_KEY` is not configured at all, all admin routes return 404.

### Security Measures

- payload size limit of 1 MB on admin writes
- string sanitization (strips `<` and `>` characters)
- `Cache-Control: no-store` on all admin API responses
- filename allowlist in file storage (only `llm_models.json` and `stt_models.json`)
- path traversal prevention via `path.basename()` normalization

---

## Data Storage

Model metadata is stored as two JSON files in the `data/` directory:

- `data/llm_models.json` -- LLM model catalog
- `data/stt_models.json` -- STT model catalog

Both files are gitignored. Example files (`*.example.json`) are committed as templates.

### Atomic Writes

The file storage layer writes to a temporary file first (`.tmp.<timestamp>`), then atomically renames it to the target path. This prevents data corruption from process crashes during writes. A round-trip JSON parse verification runs before the file is written.

---

## Schema Reference

### LLM Model

Each entry in the LLM catalog:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique model identifier |
| `fileName` | string | Local filename after download |
| `downloadUrl` | string (URL) | Direct download link |
| `approximateSize` | string | Human-readable size for UI display |
| `expectedMinBytes` | number | Minimum accepted file size for validation |
| `config.type` | enum | Model family: `qwen`, `deepseek`, `gemmait`, `llama`, `hammer`, `functiongemma`, `general` |
| `config.maxTokens` | number | Maximum generation tokens |
| `config.tokenBuffer` | number | Token buffer size |
| `config.randomSeed` | number | Random seed for inference |
| `config.temperature` | number | Sampling temperature (0-2) |
| `config.topK` | number | Top-K sampling |
| `config.topP` | number or null | Top-P (nucleus) sampling |
| `config.isThinking` | boolean | Chain-of-thought reasoning mode |
| `config.supportsFunctionCalls` | boolean | Whether the model supports tool/function calling |
| `config.fileType` | enum | `task` (LiteRT .task) or `binary` (.bin/.litertlm) |

### STT Model

Each entry in the STT catalog:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable unique model identifier |
| `fileName` | string | Local filename after download |
| `downloadUrl` | string (URL) | Direct download link |
| `approximateSize` | string | Human-readable size for UI display |
| `expectedMinBytes` | number | Minimum accepted file size for validation |
| `modelType` | string | Currently `whisper` |
| `config.variant` | string | Model variant (tiny, base, small, etc.) |
| `config.quantization` | string or null | Quantization level (q8_0, q5_1, etc.) |
| `config.coreML.downloadUrl` | string (URL) | CoreML encoder archive download link |
| `config.coreML.archiveFileName` | string | Archive filename |
| `config.coreML.extractedFolderName` | string | Expected extracted folder name |
| `config.coreML.approximateSize` | string | Human-readable size |
| `config.coreML.expectedMinBytes` | number | Minimum accepted archive size |
| `display.name` | string | User-facing model name |
| `display.description` | string | User-facing model description |

---

## Deployment

### Vercel (Recommended)

The project is a standard Next.js App Router application. Deploy to Vercel:

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add a **Vercel Blob** store to your project in the Vercel dashboard.
4. Set the `ADMIN_KEY` environment variable in Vercel project settings.
5. Ensure the `BLOB_READ_WRITE_TOKEN` environment variable is automatically populated by Vercel Blob.
6. Deploy.

When deployed on Vercel (detected automatically via the `VERCEL` environment variable), the admin panel natively uses **Vercel Blob Storage** instead of the local file system. This ensures durable persistence across deployments and serverless function executions. You no longer need to manually import data after each redeployment.

### Self-Hosted

```bash
npm run build
npm start
```

Set `ADMIN_KEY` as an environment variable before starting. The data files persist on disk in the `data/` directory.

### Docker

A standard Node.js Dockerfile works:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
ENV ADMIN_KEY=your_key_here
EXPOSE 3000
CMD ["npm", "start"]
```

Mount a volume at `/app/data` for persistent model catalog storage.

---

## Connecting MyBuddy to the Admin Panel

After deploying the admin panel, configure the MyBuddy Flutter app to use it:

In your `env.json`:

```json
{
  "MODEL_CATALOG_URL": "https://your-admin-panel-domain.com/api/llm_models",
  "STT_CATALOG_URL": "https://your-admin-panel-domain.com/api/stt_models"
}
```

Then run the Flutter app with:

```bash
flutter run --dart-define-from-file=env.json
```

The app will fetch model catalogs from your admin panel instead of the default URLs.

---

## Troubleshooting

### Admin panel returns 404

- verify `ADMIN_KEY` is set in your environment
- confirm you are using the correct key in the `?key=` query parameter
- check that `.env.local` is loaded (restart the dev server after changes)

### Models do not appear in the Flutter app

- confirm the admin panel is deployed and accessible from the device
- verify the catalog endpoints return valid JSON: `curl https://your-domain/api/llm_models`
- check that `MODEL_CATALOG_URL` and `STT_CATALOG_URL` in `env.json` point to the correct URLs
- confirm there are actual model entries in `data/llm_models.json` and `data/stt_models.json`

### Save fails in the admin dashboard

- check the browser console for network errors
- verify the admin key in the URL matches `ADMIN_KEY`
- confirm the payload does not exceed the 1 MB limit
- check server logs for Zod validation errors

### Data lost after redeployment

- **Local / Self-Hosted**: The file system is ephemeral inside Docker containers without mounted volumes. Ensure you mount a volume at the `data/` directory.
- **Vercel Deployments**: The app automatically uses Vercel Blob for persistent data storage if configured. Verify that a Vercel Blob store is attached to your project and the `BLOB_READ_WRITE_TOKEN` environment variable is set.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
