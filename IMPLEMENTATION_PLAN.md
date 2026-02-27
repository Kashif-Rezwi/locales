# IMPLEMENTATION PLAN — i18n Orchestration Engine

> Production-grade evolution of LingoAgent: from hackathon MVP to the missing infrastructure layer for multilingual web development.

---

## Document Purpose

This document is the single source of truth for building the i18n Orchestration Engine. It is derived from two authoritative references:

- **BLUEPRINT.md** — The product vision, architecture, market research, and technical design for the full Orchestration Engine.
- **lingo-agent.md** — The hackathon MVP codebase (LingoAgent), which serves as architectural inspiration and a proven starting point.

Each chunk is designed to be worked on independently, in sequence. We will analyze, brainstorm, implement, and test each chunk before moving to the next.

---

## Table of Contents

1. [Architecture Review & Gap Analysis](#architecture-review--gap-analysis)
2. [What We Are Building](#what-we-are-building)
3. [Technical Approach](#technical-approach)
4. [Chunk Breakdown](#chunk-breakdown)
5. [Cross-Cutting Concerns](#cross-cutting-concerns)
6. [Glossary](#glossary)

---

## Architecture Review & Gap Analysis

### What LingoAgent (MVP) Already Proved

| Capability | Status | Details |
|---|---|---|
| End-to-end pipeline (clone → extract → translate → PR) | Proven | Works for Next.js App Router repos in 2–5 minutes |
| Babel AST string extraction | Proven | ~95% accuracy, filters non-translatable content |
| SSE real-time progress streaming | Proven | RxJS ReplaySubject, late-join replay |
| E2B sandboxed execution | Proven | Full process isolation, throwaway VMs |
| GitHub OAuth + PR creation | Proven | Atomic commits via Git Data API |
| Sequential tool pipeline | Proven | Deterministic execution order |

### What the Production Engine Changes or Adds

| Area | MVP State | Production Decision | Reasoning |
|---|---|---|---|
| **Multi-framework support** | Next.js App Router only | Adapter registry: Next.js (App + Pages), Remix, Vite+React | Covers ~80% of React ecosystem |
| **Repo input** | Paste URL only | Repo selector + URL paste, branch picker | Better UX, prevents errors, auto-detects ownership |
| **Repo ownership** | Own repos only | Permission-aware: Direct mode or Fork mode | Supports collaborators, org repos, external repos |
| **LLM in pipeline** | Groq between every step | Removed from orchestration, used only for PR description | Saves latency, cost, and removes hallucination risk |
| **Sandbox role** | Full VM (npm, exec, code run) | Lighter Workspace Provider (clone + read only) | We don't run user code, only parse it |
| **Vercel preview** | Triggered by engine | Removed — relies on user's existing CI/CD | Eliminates hard external dependency |
| **Translation provider** | Lingo.dev only | Provider router with fallback chain | Eliminates single point of failure |
| **Translation memory** | None | Per-user TM (cross-project within same user) | Safe default; shared TM is Cloud tier |
| **Glossary** | None | Interface only (no-op in Phase 1) | Full implementation deferred to Cloud tier |
| **Confidence scoring** | None | Simple heuristics (length ratio, empty check) | Zero extra API cost; back-translation is Cloud tier |
| **User accounts** | No user model | Prisma User model, project association | Multi-user SaaS foundation |
| **URL routing / SEO** | None | Middleware, hreflang, html lang attribute | Production-grade i18n |
| **Runtime injection** | DOM walker swaps text client-side (FOUC, broken SSR) | Babel code mod — replaces strings with `t("hash")` at source level | No flash, correct SSR, search engines see translated content |
| **Language Switcher** | Injected React component | Removed — language switching is URL navigation, user owns their nav UI | Switching locale = navigating to `/fr/current-path`, not a component concern |
| **Change detection** | None (one-shot) | Hash-based diff on re-runs | Incremental updates on re-runs |

### Architectural Decisions Carried Forward from MVP

1. **Monorepo structure** (`/client` + `/server`) — clear separation, independent deployment.
2. **NestJS for server** — dependency injection, module system, guards, pipes, filters.
3. **Next.js for client** — App Router, server components where appropriate.
4. **SSE for real-time streaming** — simpler than WebSockets for one-way event flow.
5. **RxJS ReplaySubject per job** — late-joining clients get full event history.
6. **GitHub OAuth** — same token authenticates user and performs GitHub operations.
7. **Prisma ORM** — type-safe database access, migration management.
8. **Neon PostgreSQL** — serverless Postgres, branching for dev/staging.
9. **Zod for runtime validation** — schema validation for all inputs and payloads.
10. **E2B for workspace isolation** — proven, managed, scales without touching our server.

---

## What We Are Building

### One-Sentence Summary

An open-source orchestration engine that automates the entire i18n pipeline (extract → translate → inject → route → deliver) for any React-based web app, for any repo the user has access to, with a paid cloud layer on top.

### The Three-Layer Architecture

```
LAYER 3: PAID CLOUD (future)
  Team collaboration, analytics, shared translation memory,
  human review workflow, glossary management, usage billing

LAYER 2: ORCHESTRATION ENGINE (open-source core — PRIMARY FOCUS)
  Framework detection → String extraction → Translation routing →
  Runtime injection → URL routing → SEO signals → Git delivery
  Adapter registry + provider router + workspace isolation

LAYER 1: CUSTOM TRANSLATION ENGINE (integrated module)
  Per-user translation memory, multi-backend provider chain,
  heuristic confidence scoring, fallback handling
```

### System Flow (Production)

```
USER: selects repo + branch + target languages
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION ENGINE                        │
│                                                                 │
│  1. Permission check → Direct mode or Fork mode                 │
│  2. Workspace.create() → isolated clone environment (E2B)       │
│  3. Workspace.clone(repoUrl, branch)                            │
│  4. Framework Detector → adapter registry match                 │
│     └─ If Fork mode: trigger GitHub fork here (async)           │
│  5. Adapter.extractStrings() → Babel AST, all .tsx/.jsx         │
│  6. Change Detector → diff vs previous run (if re-run)          │
│  7. Translation Engine → TM lookup → provider router            │
│       ├── Per-user TM (zero cost)                               │
│       ├── DeepL Provider                                        │
│       ├── Google Translate Provider                             │
│       ├── OpenAI GPT-4 Provider                                 │
│       └── Lingo.dev Provider                                    │
│  8. Babel code mod → re-read source files, replace strings      │
│     with t("hash") calls → modified files held in memory        │
│  9. Runtime generation → t() helper, locale loader for layout   │
│  10. Routing generation → middleware, hreflang, html lang attr  │
│  11. Workspace.destroy() → clean up clone                       │
│  12. Git delivery → verify fork ready (if Fork mode)            │
│      → atomic commit of ALL files → PR (LLM writes description) │
│  13. Store results: SourceStrings, Translations, TM entries     │
│                                                                 │
│  SSE: real-time progress streaming throughout                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Tech Stack (Production)

**Server:**

| Technology | Purpose | Rationale |
|---|---|---|
| NestJS 11 | API server, DI, modules | Proven in MVP, excellent structure for complex services |
| Prisma 7 | ORM, migrations, type-safe queries | Proven in MVP, schema-first approach |
| Neon PostgreSQL | Serverless Postgres | Proven in MVP, branching for dev environments |
| RxJS 7 | Per-job SSE streaming | Proven in MVP, ReplaySubject pattern |
| Vercel AI SDK (`ai`) | LLM for PR description only | Provider-agnostic, minimal usage |
| `@babel/parser` + `@babel/traverse` | AST string extraction | Proven in MVP, ~95% accuracy |
| Zod 4 | Runtime schema validation | Proven in MVP, tool input validation |
| E2B SDK | Workspace isolation (clone + read) | Managed, scalable, no server disk usage |
| Octokit | GitHub API — repos, branches, PRs, forks | Proven in MVP, extended for new flows |

**Client:**

| Technology | Purpose | Rationale |
|---|---|---|
| Next.js 15 | React framework, App Router | Upgrade from 14, server components |
| NextAuth.js 5 | Authentication (Auth.js) | Upgrade from 4, better App Router support |
| React 19 | UI framework | Latest stable |
| Tailwind CSS 4 | Styling | Latest, faster builds |
| TypeScript 5 | Type safety | Consistent with server |

### Workspace Provider Interface

The workspace is **read-only** — it clones a repo and lets us read files. No code execution, no npm install, no writes.

```
WorkspaceProvider {
  create(): WorkspaceHandle               // Provision isolated environment
  clone(handle, repoUrl, token, branch)   // git clone --depth 1
  listFiles(handle, pattern): string[]    // Find all .tsx/.jsx files
  readFile(handle, path): string          // Read one file for Babel parsing
  destroy(handle): void                   // Guaranteed cleanup
}
```

**E2B implements this interface** — each job gets its own E2B micro-VM, our server disk usage is zero, and cleanup is guaranteed even if the pipeline crashes.

### Repository Access Flow

```
USER inputs repo (selector or URL paste)
  │
  ├─ URL pasted → match against user's repo list → auto-select if found
  │
  ▼
PERMISSION CHECK: GET /repos/{owner}/{repo}
  │
  ├─ permissions.push = true  → DIRECT mode
  │    Create branch on repo → PR on same repo
  │
  └─ permissions.push = false → FORK mode
       Clone repo (read files) → detect framework → extract strings
       → trigger fork ASYNC here (parallel with translation)
       → verify fork ready before commit step
       → create branch on fork → cross-repo PR (fork → original)
```

**Fork timing:** Forking is triggered after framework detection succeeds and extraction begins. Translation takes 30–120s. Forking takes 10–30s. The fork is ready well before we need it for commit.

### Database Schema (Production)

```
┌──────────────────┐      ┌───────────────────────────────┐
│      User        │      │           Project             │
│──────────────────│      │───────────────────────────────│
│ id (uuid)        │─────<│ userId                        │
│ githubId         │      │ id (uuid)                     │
│ email            │      │ repoUrl                       │
│ name             │      │ githubOwner   (e.g. "vercel") │
│ avatarUrl        │      │ githubRepo    (e.g. "next.js")│
│ createdAt        │      │ defaultBranch (e.g. "main")   │
│ updatedAt        │      │ accessMode    (direct | fork) │
└──────────────────┘      │ forkOwner     (if forked)     │
                          │ forkRepo      (if forked)     │
                          │ framework                     │
                          │ defaultLocale                 │
                          │ targetLocales[]               │
                          │ lastExtractedAt               │
                          │ createdAt                     │
                          │ updatedAt                     │
                          └───────────────┬───────────────┘
                                          │
               ┌──────────────────────────┼──────────────────────┐
               │                          │                      │
               ▼                          ▼                      ▼
┌──────────────────┐       ┌──────────────────────┐  ┌──────────────────┐
│       Job        │       │    SourceString      │  │   Translation    │
│──────────────────│       │──────────────────────│  │──────────────────│
│ id (uuid)        │       │ id (uuid)            │  │ id (uuid)        │
│ projectId        │       │ projectId            │  │ sourceStringId   │
│ status (enum)    │       │ hash (sha256)        │  │ targetLocale     │
│ sourceBranch     │       │ sourceText           │  │ translatedText   │
│ locales[]        │       │ filePath             │  │ provider         │
│ prUrl            │       │ nodeType             │  │ confidence       │
│ error            │       │ context              │  │ reviewStatus     │
│ logs (json)      │       │ createdAt            │  │ createdAt        │
│ metadata (json)  │       │ updatedAt            │  │ updatedAt        │
│ createdAt        │       └──────────────────────┘  └──────────────────┘
│ updatedAt        │
└──────────────────┘
┌───────────────────────────────────┐
│        TranslationMemory          │
│  (per-user, cross-project)        │
│───────────────────────────────────│
│ id (uuid)                         │
│ userId                            │
│ hash (sha256)                     │
│ sourceText                        │
│ sourceLocale                      │
│ targetLocale                      │
│ translatedText                    │
│ provider                          │
│ confidence                        │
│ usageCount                        │
│ createdAt                         │
│ updatedAt                         │
└───────────────────────────────────┘
```

### Framework Adapter Interface

```
FrameworkAdapter {
  name: string
  detect(deps, filePaths): DetectionResult
  getEntryPoint(filePaths): string
  extractStrings(workspace, workDir): SourceString[]
  applyCodeMod(workspace, workDir, strings): ModifiedFile[]  // replace strings with t("hash")
  generateRuntime(config, locales): GeneratedFile[]          // t() helper + locale loader
  generateRouting(locales): GeneratedFile[]                  // middleware + hreflang
  getCommitFiles(): FileChange[]
}
```

### Translation Provider Interface

```
TranslationProvider {
  name: string
  translate(request): TranslateResponse
  batchTranslate(requests): TranslateResponse[]
  isAvailable(): boolean
  estimateCost(wordCount, targetLocale): CostEstimate
}
```

---

## Chunk Breakdown

### Overview

13 chunks, ordered by dependency. Each chunk is fully completed and tested before the next begins.

```
FOUNDATION
  Chunk 1:  Project Scaffolding & Monorepo Setup         ✅ COMPLETE
  Chunk 2:  Database Schema & Prisma Models
  Chunk 3:  Authentication, User Management & GitHub Integration

CORE ENGINE
  Chunk 4:  Framework Adapter Registry & Detection System
  Chunk 5:  String Extraction Engine (Babel AST)
  Chunk 6:  Translation Provider Router & Interface
  Chunk 7:  Translation Memory & Custom Engine

WORKSPACE & DELIVERY
  Chunk 8:  Workspace Provider (E2B — Lighter Isolation)
  Chunk 9:  Source Code Transformation & Runtime Generation
  Chunk 10: URL Routing & SEO (hreflang, middleware)
  Chunk 11: Git Delivery (Branch, Commit, PR, Fork)

PIPELINE & CLIENT
  Chunk 12: Orchestration Pipeline & Job Management
  Chunk 13: Client Application (Dashboard, Job View, Settings)
```

> **Note:** SSE streaming is implemented within Chunk 12 (Pipeline) and consumed by Chunk 13 (Client). It is not a standalone chunk — streaming is a behaviour of the pipeline, not a separate system.

---

### Chunk 1: Project Scaffolding & Monorepo Setup

- [x] **Complete**

**What:** Set up the production monorepo structure, configure both client and server with updated dependencies, establish shared tooling (linting, formatting, TypeScript), and configure the development environment.

**Why:** Every subsequent chunk depends on a clean, well-configured foundation. The MVP's structure is our starting point — we preserve the monorepo pattern but upgrade versions and establish proper module boundaries.

**How it connects:** This produces the empty shell that all other chunks fill. The module structure established here dictates how adapters, the translation engine, and the pipeline are organised.

**Key considerations:**
- Preserve monorepo pattern (`/client` + `/server`) from MVP
- Upgrade: Next.js 15, NextAuth 5 (Auth.js), NestJS 11, Tailwind 4, Prisma 7
- Strict TypeScript config shared across both apps
- Environment variable validation on startup (fail fast with clear errors)
- Development scripts: dev, build, test, lint for both apps
- NestJS global exception filter and custom exception base classes
- Swagger/OpenAPI scaffolding from day one

**Testing strategy:**
- Both client and server start without errors
- TypeScript compiles cleanly in strict mode
- Linting passes with zero warnings
- Missing env vars produce clear error messages at startup
- Health check endpoint (`GET /api/health`) responds with 200

**Edge cases:**
- Node version mismatch — `.nvmrc` enforces correct version
- Port conflicts on development startup
- Circular module imports in NestJS

---

### Chunk 2: Database Schema & Prisma Models

- [ ] **Complete**

**What:** Design and implement the full production database schema with Prisma, covering all entities: User, Project, Job, SourceString, Translation, and TranslationMemory.

**Why:** The MVP has a single `Job` table. The production system needs a relational model that supports user ownership, project-level config, and the full translation lifecycle (source → translate → store → reuse).

**How it connects:** Every service in the system reads from or writes to this schema. Adapters create SourceStrings. The translation engine creates Translations and TM entries. The pipeline manages Jobs. The client displays everything.

**Key considerations:**
- Full schema as designed in the Technical Approach section above
- GlossaryEntry is **not included** in Phase 1 — deferred to Cloud tier
- Indexing strategy: hash lookups on TM, locale filtering on Translations, projectId on all child tables
- Enum types: `JobStatus` (pending, running, completed, failed, cancelled), `AccessMode` (direct, fork), `ReviewStatus` (pending, approved, rejected)
- Unique constraints: one Translation per (sourceStringId, targetLocale)
- Cascade deletes: delete Project → delete all related Jobs, SourceStrings, Translations
- Prisma service with NestJS lifecycle hooks (`onModuleInit`, `onModuleDestroy`)
- Seed script for local development

**Testing strategy:**
- Migrations run cleanly on an empty Neon database
- All CRUD operations work per model
- Unique constraints reject duplicate translations
- Cascade deletes remove all child records correctly
- TM hash lookup returns correct result

**Edge cases:**
- SHA-256 hash collisions — handle gracefully, astronomically rare
- Unicode normalisation before hashing (NFC) to ensure consistency
- Very long source strings (>10K chars) — use `TEXT` column type, not `VARCHAR`
- Concurrent writes to the same TM record (upsert with conflict handling)

---

### Chunk 3: Authentication, User Management & GitHub Integration

- [ ] **Complete**

**What:** Implement GitHub OAuth, persistent user accounts, session management, route protection — and build the full GitHub integration service: repo listing, branch listing, permission checking, and fork creation.

**Why:** The MVP uses GitHub OAuth ephemerally (no user model, no persistence). The production system needs persistent user accounts and, critically, a rich GitHub service that powers the repo selector, branch picker, and fork flow. Authentication and GitHub integration are deeply coupled — the same token drives both.

**How it connects:** Authentication gates every feature. The GitHub service powers the repo selector (Chunk 13), the permission check at job start (Chunk 12), and the fork trigger mid-pipeline (Chunk 11). The User model (Chunk 2) stores identity linked to all Projects and Jobs.

**Key considerations:**
- Upgrade NextAuth v4 → Auth.js v5 for Next.js 15 App Router compatibility
- GitHub OAuth scopes: `read:user`, `user:email`, `repo`
- JWT strategy: GitHub token embedded in JWT, forwarded as Bearer token to NestJS
- NestJS `AuthGuard`: validates Bearer token, extracts user identity from DB
- User creation on first login (upsert by `githubId`)
- GitHub service methods:
  - `listUserRepos(token)` — fetches all repos the user can access (own + org + collaborator), paginated, sorted by recently updated
  - `listBranches(owner, repo, token)` — fetches all branches
  - `checkPermissions(owner, repo, token)` — returns `{ push, admin, pull }`
  - `forkRepo(owner, repo, token)` — forks to user's account, returns fork details
  - `getDefaultBranch(owner, repo, token)` — returns default branch name
- URL paste: if pasted URL matches any repo in the user's list, auto-select it

**Testing strategy:**
- Full OAuth flow: login → callback → session created → user upserted in DB
- Subsequent logins update existing user (upsert, not duplicate)
- Protected API routes return 401 for unauthenticated requests
- Protected API routes return 403 for cross-user resource access
- `listUserRepos` returns own repos, org repos, and collaborator repos
- `checkPermissions` correctly identifies push access vs read-only
- `forkRepo` creates a fork and returns the correct fork URL
- Session persists across page reloads

**Edge cases:**
- GitHub token revoked mid-session — next API call returns 401, redirect to login
- User is a member of an org but the repo is private — permissions check handles this
- `forkRepo` called on a repo that is already forked — return existing fork, don't duplicate
- Pasted URL is a non-GitHub URL — validate and reject with clear message
- GitHub API rate limit during repo listing — surface error gracefully

---

### Chunk 4: Framework Adapter Registry & Detection System

- [ ] **Complete**

**What:** Build the plugin-based adapter registry that auto-detects the React framework of a repository and loads the correct adapter. Implement the adapter interface and all four initial adapters.

**Why:** The MVP hardcodes Next.js App Router. The production system needs a registry where each framework is self-contained. Adding a new framework doesn't touch the core pipeline.

**How it connects:** The adapter is invoked by the pipeline (Chunk 12) at detection, string extraction (Chunk 5), runtime injection (Chunk 9), and routing generation (Chunk 10). The workspace (Chunk 8) provides file access for detection and extraction.

**Key considerations:**
- `FrameworkAdapter` interface as defined in Technical Approach
- Adapter registry: register, detect (returns ranked matches), get by name
- Detection priority: most specific wins (App Router before generic Next.js)
- Four adapters in Phase 1:
  - `nextjs-app-router` — `app/layout.tsx` present, Next.js in deps
  - `nextjs-pages-router` — `pages/_app.tsx` present, Next.js in deps
  - `vite-react` — `vite.config.ts` present, React in deps, `src/main.tsx`
  - `remix` — `@remix-run/react` in deps, `app/root.tsx` present
- Detection uses: `package.json` deps + file tree patterns (no code execution)
- Each adapter is a self-contained NestJS provider

**Testing strategy:**
- Correctly identifies all four frameworks from their file signatures
- Returns "unsupported" for Vue, Svelte, Angular repos
- Priority ordering: App Router wins over Pages Router in hybrid repos
- Registry rejects duplicate adapter names on registration

**Edge cases:**
- Repo has both `app/` and `pages/` directories (Next.js hybrid) — App Router wins
- Missing or malformed `package.json` — graceful failure with clear error
- Custom directory structures (non-standard entry points) — detection returns unsupported
- Version-specific differences (Next.js 13 vs 14 vs 15) — handled within the adapter

---

### Chunk 5: String Extraction Engine (Babel AST)

- [ ] **Complete**

**What:** Build the production-grade Babel AST string extraction system that scans all `.tsx`/`.jsx` files and identifies every user-facing string, with filtering, deduplication, and context preservation.

**Why:** String extraction is the foundation of the entire pipeline. Miss strings → untranslated UI. Over-extract → wasted translation budget. The MVP extractor works but needs production hardening: better filtering, context tracking, and graceful failure handling.

**How it connects:** Called by each adapter's `extractStrings()` method. Output becomes SourceString records (Chunk 2). Strings are passed to the translation engine (Chunk 7). Change detection (Chunk 12) diffs current extraction against previous.

**Key considerations:**
- Babel config: JSX, TypeScript, decorators, optional chaining
- Node types to extract: `JSXText`, `JSXAttribute` (placeholder, alt, title, aria-label, aria-placeholder), `StringLiteral` inside JSX expressions, template literals with no interpolation
- Filtering rules (do NOT extract): URLs, CSS class strings, camelCase identifiers, CONSTANT_CASE, single characters, code keywords (`"use client"`, `"use server"`), import paths, symbol-only strings
- Context preserved per string: file path, line number, parent component name, node type
- Deduplication: same string in multiple files → one SourceString with multiple location references
- SHA-256 hash of normalised (trimmed, NFC) source text
- Streaming: parse and emit one file at a time — don't hold all ASTs in memory
- Fallback: 5-pass regex scan if Babel fails to parse a file (syntax errors, exotic syntax)

**Testing strategy:**
- Extracts `<h1>Welcome</h1>` → `"Welcome"`
- Extracts `placeholder="Email address"` → `"Email address"`
- Extracts `{"Get started free"}` → `"Get started free"`
- Skips `className="flex items-center gap-4"`
- Skips `href="https://example.com"`
- Skips `"use client"`
- Handles TypeScript generics and type assertions without failing
- Deduplicates identical strings across files
- Falls back to regex on a file that fails to parse

**Edge cases:**
- `{isOpen ? "Open" : "Closed"}` — extract both strings
- `Hello {name}!` — extract static part `"Hello "` only, or flag as dynamic
- Multi-line JSXText with leading/trailing whitespace — trim before hashing
- Files over 5000 lines — stream processing prevents memory issues
- Strings with HTML entities (`&amp;`) — decode before normalisation

---

### Chunk 6: Translation Provider Router & Interface

- [ ] **Complete**

**What:** Build the translation provider interface, the provider router with priority and fallback chain logic, and implement concrete providers (DeepL, Google Translate, OpenAI GPT-4, Lingo.dev).

**Why:** The MVP depends solely on Lingo.dev. If it's down, everything fails. The production system needs a provider-agnostic interface where providers are tried in priority order and automatically fall back.

**How it connects:** The provider router is called by the translation engine (Chunk 7), which wraps it with TM lookup and confidence scoring. Results flow back to the pipeline (Chunk 12) and are stored as Translation records (Chunk 2).

**Key considerations:**
- `TranslationProvider` interface as defined in Technical Approach
- Provider router: configurable priority chain, automatic fallback on any error
- Batch translation: group strings into chunks of 50 per API call
- Retry logic: exponential backoff for rate limits and timeouts; immediate fail for auth errors
- Error categories: retryable (rate limit, 5xx, timeout) vs fatal (401, unsupported language)
- Cost tracking: record which provider was used per translation
- Provider implementations: DeepL, Google Translate, OpenAI GPT-4, Lingo.dev

**Testing strategy:**
- Each provider translates a known English string to French correctly
- Router falls back to next provider when primary returns an error
- Rate limit triggers retry with backoff, not immediate failure
- Auth failure on primary does NOT retry — fails immediately and moves to next provider
- Batch of 120 strings is correctly split into 3 calls of 40 each

**Edge cases:**
- Provider returns partial results (50 strings sent, 47 returned)
- Provider returns empty string for a translation — treat as failure, try next provider
- String exceeds provider character limit — split or truncate with warning
- Language pair not supported by primary provider — fallback handles it
- All providers fail for a given string — mark translation as failed, pipeline continues

---

### Chunk 7: Translation Memory & Custom Engine

- [ ] **Complete**

**What:** Build the translation engine that wraps the provider router (Chunk 6) with per-user translation memory, heuristic confidence scoring, and a structured translation pipeline.

**Why:** TM is the compounding moat. Every translation processed makes future runs faster and cheaper. On re-runs, TM hit rates grow — eventually many strings cost zero API calls. This is what separates the engine from a simple "call DeepL" wrapper.

**How it connects:** Sits between the orchestration pipeline (Chunk 12) and translation providers (Chunk 6). Intercepts every translation request, checks TM first, routes misses to providers, stores results. The pipeline calls this engine, not providers directly.

**Key considerations:**
- Translation pipeline per string: normalise → hash → TM lookup → (hit: return TM result) → (miss: provider router) → confidence score → store to TM
- TM keyed by `(userId, hash, sourceLocale, targetLocale)` — per-user scope
- Batch optimisation: check ALL TM hits in one DB query before calling any provider
- Confidence scoring (heuristic, zero additional API cost):
  - Length ratio vs expected range for that language pair
  - Empty translation → confidence 0
  - Source === translation → confidence 0
  - HTML/markdown structure preserved → confidence boost
- TM usage count incremented on each reuse (for analytics)
- Metrics emitted per batch: TM hit rate, provider used, strings count, estimated cost

**Testing strategy:**
- First translation of a string calls the provider
- Second translation of the same string (same user, different project) returns TM result with zero provider calls
- TM `usageCount` increments on each reuse
- Batch of 100 strings where 70 are in TM → only 30 provider calls made
- Confidence score of 0 returned for empty or untranslated strings

**Edge cases:**
- Concurrent pipeline runs for the same user translating the same string — upsert prevents duplicate TM writes
- TM entry exists but is very old — for Phase 1, always use TM regardless of age
- Source text changed by one word — new hash, treated as new string (no fuzzy match in Phase 1)

---

### Chunk 8: Workspace Provider (E2B — Lighter Isolation)

- [ ] **Complete**

**What:** Build the workspace abstraction layer backed by E2B. Each job gets an isolated environment to clone and read the repo. No code execution, no npm install — read-only workspace.

**Why:** Cloning repos to the server's own filesystem doesn't scale. 100 concurrent jobs could consume 50GB+ of server disk and saturate I/O. E2B gives each job its own isolated storage. Our server's disk usage is zero. Cleanup is guaranteed even if the pipeline crashes.

**How it connects:** The pipeline (Chunk 12) calls `workspace.create()` at job start and `workspace.destroy()` at completion or failure. The adapter (Chunk 4) calls `workspace.listFiles()` and `workspace.readFile()` during detection and extraction.

**Key considerations:**
- `WorkspaceProvider` interface: `create`, `clone`, `listFiles`, `readFile`, `destroy` — no `exec`, no `writeFile`
- E2B implementation wraps E2B SDK with this interface
- `git clone --depth 1 --branch {branch}` for shallow, branch-specific clones
- `listFiles(pattern)` — returns all file paths matching a glob (e.g., `**/*.tsx`)
- `readFile(path)` — returns file content as a string for Babel parsing
- Workspace is destroyed in a `finally` block — cleanup always happens
- Active workspace map for cleanup on server shutdown (`onModuleDestroy`)
- Configurable timeout (default 10 minutes) — workspace auto-destroyed after timeout

**Testing strategy:**
- `create()` returns a valid workspace handle
- `clone()` successfully clones a public repo into the workspace
- `listFiles("**/*.tsx")` returns correct file paths
- `readFile("src/app/page.tsx")` returns correct file content
- `destroy()` cleans up the workspace
- Cleanup runs even when the pipeline throws mid-execution
- Timeout kills the workspace after the configured duration

**Edge cases:**
- E2B API key missing or expired — fail fast with clear error at startup
- `clone()` fails (private repo, bad token, network error) — propagate structured error
- Repo is extremely large — `git clone --depth 1` bounds the size, but add size warning
- `readFile()` called on a path that doesn't exist — return null, not a crash
- Server shuts down with active workspaces — `onModuleDestroy` calls `destroy()` on all

---

### Chunk 9: Source Code Transformation & Runtime Generation

- [ ] **Complete**

**What:** Build the two-pass system that (1) transforms all source files by replacing hardcoded strings with `t("hash")` calls via Babel code mod, and (2) generates the minimal i18n runtime — a `t()` helper function and a locale loader for the root layout — as in-memory file objects ready for Git commit.

**Why:** The correct approach to production i18n is transforming the source code, not patching the DOM after render. URL routing means the locale is known at request time — so translations must happen at render time, not after. A DOM walker causes flash of untranslated content, breaks SSR, and prevents search engines from indexing translated pages. A Babel code mod produces clean, readable, developer-reviewable code in the PR with zero runtime hacks.

**What is explicitly NOT included:**
- ❌ **Language Switcher component** — language switching is URL navigation (`/fr/about` → `/de/about`). The user designs their own nav. We inject nothing.
- ❌ **DOM Walker / Text Translator** — replaced entirely by the source code transformation pass.
- ❌ **React Context for current locale** — locale comes from URL params, not client-side state.

**How it connects:** This chunk has two sub-systems. The code mod (pass 1) re-reads all source files already parsed by Chunk 5 (Extraction), applies Babel transforms in memory, and returns `ModifiedFile[]`. The runtime generator (pass 2) produces `GeneratedFile[]`. Both sets of files are collected by the pipeline (Chunk 12) and passed to Git delivery (Chunk 11). The workspace remains read-only throughout — all transformations happen in server memory.

**Key considerations:**

*Pass 1 — Babel Code Mod (source file transformation):*
- Re-read each source file from workspace (same files extracted in Chunk 5)
- Babel transform: replace every extracted string node with `{t("hash")}` equivalent
  - `<h1>Welcome</h1>` → `<h1>{t("a3f9c2")}</h1>`
  - `placeholder="Email"` → `placeholder={t("b7d1e4")}`
  - `{"Get started"}` → `{t("c8f2a1")}`
- The hash used is the same SHA-256 generated during extraction — no new IDs invented
- Modified file content held in memory as `{ path, content }` — never written to workspace
- Files with zero extracted strings are skipped (not included in commit)
- Generated code must be clean, readable TypeScript — developers will review it in the PR

*Pass 2 — Runtime Generation (new files only):*
- `lib/i18n.ts` — the `t(hash)` helper: reads from the locale translation map, returns translated string or falls back to source text if missing
- Root layout patch — inject locale loader: reads locale from URL params, loads `public/locales/{locale}.json`, passes translation map to `t()` — framework-specific per adapter (layout.tsx, _app.tsx, root.tsx, main.tsx)
- `public/locales/{locale}.json` — flat JSON files: `{ "a3f9c2": "Bonjour", "b7d1e4": "Tarifs" }` — one file per target locale
- All runtime code is zero-dependency — no external packages required at runtime in the user's project
- Generated TypeScript must pass strict mode and standard ESLint rules

**Testing strategy:**
- `<h1>Welcome</h1>` is transformed to `<h1>{t("a3f9c2")}</h1>` in the modified file
- `placeholder="Email"` is transformed to `placeholder={t("b7d1e4")}`
- Files with no extracted strings are not included in the modified file set
- The same hash from extraction is used in the code mod — no mismatch
- `t("a3f9c2")` with French locale loaded returns `"Bonjour"`, not `"Welcome"`
- `t("unknown_hash")` falls back to the source text gracefully
- Root layout correctly loads locale JSON based on URL params
- Generated TypeScript compiles without errors in strict mode
- No Language Switcher file is generated

**Edge cases:**
- A string appears in both JSXText and a JSX attribute in the same file — both are transformed correctly
- Source file uses non-standard export (named export, re-export) — code mod preserves the export signature
- Root layout already imports something named `t` — rename the helper to avoid collision (e.g., `i18nT`)
- App uses server components (Next.js) — locale loader in root layout is a server component; `t()` helper works in both server and client components
- Locale JSON for a target language has a missing key — `t()` falls back to source text, no crash
- Very large source file (>5000 lines) — Babel transform streams node by node, no full-file AST held in memory beyond what Babel requires

---

### Chunk 10: URL Routing & SEO (hreflang, middleware)

- [ ] **Complete**

**What:** Generate locale-prefixed URL routing (`/fr/about`, `/de/pricing`) and proper SEO metadata (hreflang tags, `html lang` attribute, sitemap entries) as in-memory file objects for inclusion in the PR.

**Why:** Client-side-only locale switching has zero SEO benefit. Production i18n requires each locale to have its own crawlable URL. This is the key technical advantage over proxy-based solutions like Weglot.

**How it connects:** URL routing is framework-specific logic inside each adapter. The adapter calls its routing generator and returns `GeneratedFile[]`. These are collected alongside runtime files and committed together in Git delivery (Chunk 11).

**Key considerations:**
- URL pattern: `/[locale]/...` prefix (e.g., `/fr/about`)
- Middleware generation (Next.js): `middleware.ts` that detects locale from URL, cookie, and `Accept-Language` header, then redirects
- hreflang tags: `<link rel="alternate" hreflang="fr" href="..." />` for all locales + `x-default`
- `html lang` attribute updated to reflect current locale dynamically
- 301 permanent redirects, not 302
- Sitemap: generate locale-specific URL entries per page

**Testing strategy:**
- Middleware redirects `/about` → `/en/about` (default locale)
- `/fr/about` serves French content
- hreflang tags cover all target locales + `x-default`
- No duplicate hreflang entries generated
- API routes (`/api/...`) are excluded from locale prefixing
- Static assets (`/_next/...`, `/images/...`) are excluded

**Edge cases:**
- Repo already has a `middleware.ts` — merge locale logic, do not overwrite
- Catch-all routes `[...slug]` — locale prefix must be applied first
- Root path `/` — redirect to `/[defaultLocale]`
- Trailing slash inconsistency — normalise to match repo's existing convention

---

### Chunk 11: Git Delivery (Branch, Commit, PR, Fork)

- [ ] **Complete**

**What:** Build the git delivery system that creates a branch, commits all generated files atomically, and opens a pull request. Handles both Direct mode (branch on original repo) and Fork mode (branch on fork, cross-repo PR).

**Why:** The engine's output must be a clean, reviewable PR. Atomic commits via the Git Data API guarantee no partial state. LLM generates the PR description (the one place LLM adds clear value — creative writing).

**How it connects:** Git delivery is the final active step of the pipeline (Chunk 12). It receives `GeneratedFile[]` from the runtime generator (Chunk 9) and routing generator (Chunk 10). It uses the GitHub token from authentication (Chunk 3). In Fork mode, the fork was already created by the GitHub service (Chunk 3) mid-pipeline.

**Key considerations:**
- Git Data API sequence: create blobs → create tree → create commit → update ref (atomic)
- Branch naming: `i18n/add-{locales}-{timestamp}` (e.g., `i18n/add-fr-de-1709123456`)
- **Direct mode:** branch on `{owner}/{repo}` → PR targeting default branch
- **Fork mode:** confirm fork is ready (poll `GET /repos/{forkOwner}/{forkRepo}` until 200) → branch on fork → cross-repo PR (`{forkOwner}/{forkRepo}:{branch}` → `{owner}/{repo}:{defaultBranch}`)
- PR title: `"Add i18n support: French, German, Japanese"`
- PR body: LLM-generated, includes — languages added, string count, TM hit rate, files changed, brief explanation of what was generated
- Existing branch with same name — append `-2`, `-3` suffix rather than failing

**Testing strategy:**
- Files are committed atomically (no partial state if network fails mid-sequence)
- PR targets the correct default branch
- Fork mode: PR is a cross-repo PR from fork to original
- PR body is informative and accurate
- Branch already exists — appends suffix instead of erroring

**Edge cases:**
- `repo` scope missing from GitHub token — surface clear error before attempting
- Repository has branch protection rules — PR still opens, merge is user's responsibility
- Fork creation takes longer than expected — polling handles this, with a timeout
- Very large number of generated files (>100) — Git Tree API handles batch, no per-file limit issue
- Repo is archived — fail fast with clear user-facing message

---

### Chunk 12: Orchestration Pipeline & Job Management

- [ ] **Complete**

**What:** Build the deterministic pipeline orchestrator that sequences all steps end to end, manages job lifecycle, handles errors and cancellation, and streams real-time progress to the client via SSE.

**Why:** This is the core of the engine — the coordinator that calls every other chunk in the right order. The MVP used LLM-between-steps; we replace that with a deterministic function chain. SSE streaming is built into this chunk because it is a behaviour of the pipeline, not a separate system.

**How it connects:** The pipeline calls every other chunk: workspace (Chunk 8) for isolation, adapters (Chunk 4) for detection and extraction, translation engine (Chunk 7) for translations, runtime generator (Chunk 9) and routing generator (Chunk 10) for file generation, and git delivery (Chunk 11) for output.

**Key considerations:**

**Pipeline steps (deterministic, no LLM between steps):**
```
1.  Permission check   → determine accessMode (direct | fork)
2.  Workspace.create + clone
3.  Framework detection → select adapter
4.  String extraction  → SourceString records (Babel parse, read-only)
    └─ If Fork mode: trigger GitHub fork HERE (async, non-blocking)
5.  Change detection   → diff vs previous extraction (if re-run)
6.  Translation        → TM lookup then provider router → locale JSONs in memory
7.  Babel code mod     → re-read source files, replace strings with t("hash")
                         → ModifiedFile[] held in memory
8.  Runtime generation → t() helper + locale loader patch → GeneratedFile[] in memory
9.  Routing generation → middleware + hreflang → GeneratedFile[] in memory
10. Workspace.destroy  → E2B workspace cleaned up
11. Git delivery       → verify fork ready (if Fork mode)
                         → atomic commit: ModifiedFile[] + GeneratedFile[] + locale JSONs
                         → PR opened (LLM writes description only)
12. Store results      → SourceStrings, Translations, TM entries persisted
```

**SSE streaming (built into this chunk):**
- RxJS `ReplaySubject` per job — late-joining clients replay full event history
- Event types: `log`, `progress`, `step-change`, `complete`, `error`, `heartbeat`
- Heartbeat every 30s to keep the connection alive
- Event format: `{ type, data: { message, level, step, timestamp, metadata } }`
- Stream closes cleanly on completion, failure, or cancellation
- Memory: `ReplaySubject` is deleted from the map after stream closes

**Job lifecycle:**
- `pending` → `running` → `completed` / `failed` / `cancelled`
- Abort: cancel signal kills workspace, marks job `cancelled`, closes SSE stream
- `metadata` JSON field stores: stringCount, wordCount, tmHitRate, providerUsed, durationMs

**Rate limiting:** max 3 concurrent jobs per user (configurable). On the 4th submission, return a clear error: "You already have 3 jobs running."

**Testing strategy:**
- Full pipeline completes for a simple Next.js App Router public repo
- Full pipeline completes in Fork mode (external repo)
- Pipeline fails gracefully on unsupported framework
- Pipeline fails gracefully on zero translatable strings found
- Change detection on re-run correctly identifies new and removed strings
- Cancel mid-pipeline: workspace destroyed, job marked cancelled, SSE stream closes
- Late-joining SSE client replays all past events
- Concurrent job limit is enforced correctly

**Edge cases:**
- Pipeline crashes after workspace created — `finally` block ensures `workspace.destroy()`
- Fork not ready by the time Git delivery starts — poll with timeout (max 2 minutes), fail with clear error if exceeded
- Same repo submitted twice simultaneously by the same user — second job is queued after first
- Re-run on a repo where strings were deleted — old SourceStrings removed, TM entries retained
- Very large repo (5000+ .tsx files) — streaming file-by-file prevents OOM

---

### Chunk 13: Client Application (Dashboard, Job View, Settings)

- [ ] **Complete**

**What:** Build the full client application: authentication, repo selector with branch picker, dashboard, real-time job progress view, result display, job history, and settings.

**Why:** The client is the user's interface to the entire engine. It must handle all repo ownership scenarios gracefully, stream progress in real-time, and surface errors clearly.

**How it connects:** Consumes every server API — authentication (Chunk 3), repo and branch listing (Chunk 3), job submission and management (Chunk 12), SSE streaming (Chunk 12).

**Key considerations:**

**Pages:**
- `/login` — GitHub sign-in
- `/dashboard` — three tabs: New Job, History, Settings
- `/jobs/[jobId]` — real-time progress, result card on completion

**New Job tab flow:**
1. Repo selector: searchable list (own + org + collaborator repos, fetched on load)
2. URL paste fallback: if URL matches a list item → auto-select; if external → proceed with permission check at job start
3. Branch picker: dropdown, fetched after repo selected, defaults to repo's default branch
4. Language selector: chip-based multi-select
5. Submit

**Components:**
- `RepoSelector` — searchable, grouped (My Repos / Organisations / Collaborating), shows repo visibility (public/private)
- `BranchPicker` — dropdown, loaded async after repo selection
- `LanguageSelector` — chip multi-select, 28 locales
- `LogStream` — terminal-style, auto-scrolling, step-labelled entries
- `ProgressStepper` — pipeline steps as chips with active/done/error states
- `ResultCard` — PR URL with copy button, fork context note if applicable
- `JobHistoryTab` — previous jobs with status badges and PR links

**Hooks:**
- `useRepos(token)` — fetches and caches user's repo list
- `useBranches(owner, repo, token)` — fetches branches for selected repo
- `useJobStream(jobId)` — opens SSE, replays events, handles reconnection
- `useJobHistory()` — persists history to localStorage (up to 50 entries)
- `useSettings()` — manages API keys in localStorage

**State management:** React Query for server state (repos, branches, job data). React Context for auth session.

**Testing strategy:**
- Repo selector lists own, org, and collaborator repos
- Pasting a URL that matches a repo auto-selects it in the list
- Branch picker loads correctly after repo selection
- Job submission sends correct payload (repoUrl, branch, locales, accessMode)
- SSE progress displays in real-time with correct step labels
- Completed job shows PR URL with fork context note if applicable
- Failed job shows clear error message
- SSE disconnect → reconnect replays full history seamlessly

**Edge cases:**
- User has 0 accessible repos — show empty state with helpful message
- Repo list takes long to load — skeleton loading state
- SSE connection drops — `EventSource` auto-reconnects, ReplaySubject covers the gap
- User navigates away mid-job — SSE continues server-side; returning to the job URL replays everything
- Very long repo name or URL — truncate in UI, preserve full value in payload

---

## Cross-Cutting Concerns

### Error Handling Strategy

- **Server:** Global NestJS exception filter with structured JSON error responses. Custom exception classes: `FrameworkNotSupportedError`, `TranslationProviderError`, `WorkspaceError`, `GitDeliveryError`, `PermissionError`.
- **Client:** Error boundaries per page. Toast notifications for recoverable errors. Full-page error states for job failures with actionable guidance.
- **Pipeline:** Fail fast on fatal errors. Retry with exponential backoff on transient errors (rate limits, timeouts). All errors emitted as SSE `error` events before closing the stream.

### Security

- GitHub tokens: never logged, never stored in DB, held only in memory for the duration of the pipeline
- User API keys (DeepL, Google, etc.): stored encrypted if server-side, transmitted only over HTTPS
- Workspace isolation: user code is cloned into E2B — no access to the host server
- Input validation: all API inputs validated with Zod/class-validator before processing
- Rate limiting: per-user concurrent job limit (max 3), per-endpoint request rate limiting

### Logging & Observability

- Structured JSON logging with `jobId` correlation on every log line
- Key metrics per job: duration, stringCount, wordCount, tmHitRate, providerUsed, estimatedCost
- Health check endpoint: `GET /api/health` returns status of DB connection, E2B connectivity, and translation provider availability

### Performance

- TM batch lookup: all strings checked in a single `WHERE hash IN (...)` query before any provider calls
- Babel parsing: one file at a time (streaming), AST GC'd between files
- Translation batching: 50 strings per provider API call
- Locale file generation: in-memory, never written to disk
- Workspace: `git clone --depth 1` — only the latest snapshot, no history

---

## Glossary

| Term | Definition |
|---|---|
| **Adapter** | A plugin encapsulating all framework-specific logic: detection, extraction, code mod, runtime generation, routing |
| **Access Mode** | `direct` (user has push access) or `fork` (no push access — engine forks first) |
| **AST** | Abstract Syntax Tree — the parsed representation of source code used by Babel to find and transform strings |
| **Babel Code Mod** | A source-level transformation that replaces hardcoded strings in component files with `t("hash")` calls |
| **Confidence Score** | A 0.0–1.0 heuristic rating of translation quality based on length ratio and structural checks |
| **Fork Mode** | Pipeline path for external repos: fork the repo, run pipeline, open cross-repo PR |
| **Heuristic Scoring** | Confidence scoring using rule-based checks (length ratio, empty check) — no back-translation API calls |
| **hreflang** | HTML tag telling search engines which language version of a page to serve per locale |
| **Locale** | A language/region identifier (e.g., `fr`, `pt-BR`, `zh-TW`) |
| **Locale Loader** | Code injected into the root layout that reads the locale from URL params and loads the correct locale JSON |
| **ModifiedFile** | An existing source file that has been transformed by the Babel code mod — held in memory, committed via Git API |
| **Orchestration** | Coordinating all i18n steps beyond translation: extraction, code mod, runtime, routing, SEO, delivery |
| **Provider Router** | Routes translation requests through a priority chain with automatic fallback |
| **ReplaySubject** | RxJS Observable that buffers events and replays them to late-joining SSE subscribers |
| **t() helper** | A minimal function generated by the engine: given a hash, returns the translated string for the current locale |
| **TM** | Translation Memory — per-user cache of all previously translated strings, enabling zero-cost reuse |
| **Workspace** | An isolated E2B environment for cloning and reading a repo. Read-only — no code execution, no writes |

---

## Progress Tracker

| # | Chunk | Status | Notes |
|---|---|---|---|
| 1 | Project Scaffolding & Monorepo Setup | Not Started | |
| 2 | Database Schema & Prisma Models | Not Started | |
| 3 | Authentication, User Management & GitHub Integration | Not Started | |
| 4 | Framework Adapter Registry & Detection System | Not Started | |
| 5 | String Extraction Engine (Babel AST) | Not Started | |
| 6 | Translation Provider Router & Interface | Not Started | |
| 7 | Translation Memory & Custom Engine | Not Started | |
| 8 | Workspace Provider (E2B — Lighter Isolation) | Not Started | |
| 9 | Source Code Transformation & Runtime Generation | Not Started | |
| 10 | URL Routing & SEO (hreflang, middleware) | Not Started | |
| 11 | Git Delivery (Branch, Commit, PR, Fork) | Not Started | |
| 12 | Orchestration Pipeline & Job Management | Not Started | |
| 13 | Client Application (Dashboard, Job View, Settings) | Not Started | |
