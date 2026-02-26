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
| End-to-end pipeline (clone → extract → translate → PR → preview) | Proven | Works for Next.js App Router repos in 2-5 minutes |
| Babel AST string extraction | Proven | ~95% accuracy, filters non-translatable content |
| SSE real-time progress streaming | Proven | RxJS ReplaySubject, late-join replay |
| E2B sandboxed execution | Proven | Full process isolation, throwaway VMs |
| GitHub OAuth + PR creation | Proven | Atomic commits via Git Data API |
| Vercel preview deployments | Proven | Poll-until-ready pattern |
| LLM-as-planner architecture | Proven | Sequential tool forcing, one schema at a time |

### What the Production Engine Must Add (Gaps)

| Gap | MVP State | Production Target | Why It Matters |
|---|---|---|---|
| **Multi-framework support** | Next.js App Router only | Next.js (App + Pages), Remix, Vite+React | Covers ~80% of React ecosystem |
| **Framework adapter registry** | Hardcoded detection | Plugin-based adapter system | Enables community extensibility |
| **Translation provider abstraction** | Lingo.dev only (single point of failure) | Provider router with fallback chain | Eliminates vendor lock-in |
| **Custom Translation Engine** | None | TM, glossary, multi-backend pipeline, confidence scoring | Compounding moat, cost reduction |
| **URL routing / SEO** | None (client-side only) | Middleware-based locale routing, hreflang tags | Production-grade i18n |
| **Change detection / sync** | None (one-shot only) | Hash-based diff on re-runs (new/changed/deleted strings) | Incremental updates |
| **User accounts & persistence** | No user model, localStorage history | Prisma user model, project association, job history | Multi-user SaaS |
| **Team collaboration** | None | Shared projects, role-based access | Cloud tier feature |
| **Dashboard & analytics** | Basic job viewer | Translation coverage, cost tracking, quality metrics | Cloud tier feature |
| **Pluralisation / ICU** | None | ICU MessageFormat support | Complex languages (Arabic, Russian) |
| **RTL layout** | None | `dir="rtl"` + CSS logical properties | Arabic, Hebrew support |
| **SSR translations** | None (client-side DOM walker) | Server component support for Next.js | Eliminates translation flash |
| **Execution backend abstraction** | E2B only (requires paid key) | E2B for cloud, Docker for OSS self-hosting | OSS accessibility |
| **Human review workflow** | None | Low-confidence translations queued for review | Quality assurance |
| **CI/CD integration** | None | GitHub Action for auto-translate on push | Developer workflow |

### Architectural Decisions Carried Forward from MVP

These patterns from LingoAgent are validated and will be preserved:

1. **Monorepo structure** (`/client` + `/server`) — clear separation, independent deployment.
2. **NestJS for server** — dependency injection, module system, guards, pipes, filters.
3. **Next.js for client** — App Router, server components where appropriate.
4. **SSE for real-time streaming** — simpler than WebSockets for one-way event flow.
5. **RxJS ReplaySubject per job** — late-joining clients get full history.
6. **GitHub OAuth** — same token authenticates user and performs GitHub operations.
7. **Prisma ORM** — type-safe database access, migration management.
8. **Neon PostgreSQL** — serverless Postgres, branches for dev/staging.
9. **Zod for runtime validation** — schema validation for tool inputs and API payloads.
10. **Sequential tool pipeline** — deterministic execution order, LLM generates arguments only.

### Architectural Decisions That Change

| MVP Approach | Production Approach | Reasoning |
|---|---|---|
| Single `Job` model | `User`, `Project`, `Job`, `SourceString`, `Translation`, `TranslationMemory`, `GlossaryEntry` models | Multi-user SaaS with translation memory |
| Hardcoded framework detection | Adapter registry with `detect()`, `extractStrings()`, `injectRuntime()`, `generateRouting()` interface | Extensibility for new frameworks |
| Lingo.dev SDK direct calls | Translation Provider interface with router + fallback chain | Vendor independence, reliability |
| E2B only | Abstracted execution backend (E2B / Docker) | OSS self-hosting support |
| Groq LLM (llama-3.3-70b) | Configurable LLM provider (Groq, OpenAI, Anthropic) via Vercel AI SDK | User choice, cost flexibility |
| In-memory tool definitions | Tool registry with dynamic loading | Decoupled tool lifecycle |
| No i18n runtime customisation | Configurable runtime strategy (React Context, next-intl integration, i18next integration) | Fits existing project setups |

---

## What We Are Building

### One-Sentence Summary

An open-source orchestration engine that automates the entire 7-step i18n pipeline (extract → key → translate → store → detect → load → replace) for any React-based web app, with a paid cloud layer for translation memory, team collaboration, and analytics.

### The Three-Layer Architecture

```
LAYER 3: PAID CLOUD (future — not in initial implementation)
  Dashboard, team collaboration, analytics, human review workflow,
  translation memory across projects, glossary management, usage billing

LAYER 2: ORCHESTRATION ENGINE (open-source core — PRIMARY FOCUS)
  Framework detection → String extraction → Translation routing →
  Runtime injection → URL routing → SEO signals → Git delivery
  Adapter registry for frameworks + translation providers

LAYER 1: CUSTOM TRANSLATION ENGINE (integrated module)
  String database, translation memory (TM), glossary,
  multi-backend pipeline (Google → DeepL → GPT-4 fallback chain),
  confidence scoring, human review queue
```

### System Flow (Production)

```
USER: "Internationalise my React app to French, Arabic, and Japanese"
  │
  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION ENGINE                            │
│                                                                      │
│  1. Authenticate user (GitHub OAuth)                                 │
│  2. Create Project record (or load existing)                         │
│  3. Clone repo into sandboxed environment (E2B or Docker)            │
│  4. Read package.json + file structure                               │
│  5. Framework Detector → loads correct Adapter                       │
│  6. Adapter.extractStrings() → Babel AST scans all .tsx/.jsx         │
│  7. Change Detector → diff against previous run (if re-run)          │
│  8. Translation Provider Router → routes to configured backend       │
│       ├── Custom Engine (TM lookup → glossary → multi-backend)       │
│       ├── DeepL Provider                                             │
│       ├── Google Translate Provider                                  │
│       ├── OpenAI GPT-4 Provider                                      │
│       └── Lingo.dev Provider                                         │
│  9. Adapter.injectRuntime() → writes i18n runtime + config           │
│ 10. Adapter.generateRouting() → URL routing + hreflang metadata      │
│ 11. Git: commit all changes → push → open PR                        │
│ 12. Optional: trigger preview deployment                             │
│ 13. Store results: SourceStrings, Translations, TM entries           │
│                                                                      │
│  SSE: Real-time progress streaming throughout                        │
└──────────────────────────────────────────────────────────────────────┘
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
| Vercel AI SDK (`ai`) | LLM abstraction, tool calling | Proven in MVP, provider-agnostic |
| `@babel/parser` + `@babel/traverse` | AST string extraction | Proven in MVP, ~95% accuracy |
| Zod 4 | Runtime schema validation | Proven in MVP, tool input validation |
| E2B SDK | Cloud sandbox execution | Proven in MVP, process isolation |
| Docker SDK | OSS sandbox execution | New — enables self-hosting |
| Octokit | GitHub API | Proven in MVP, atomic Git operations |

**Client:**

| Technology | Purpose | Rationale |
|---|---|---|
| Next.js 15 | React framework, App Router | Upgrade from 14, server components |
| NextAuth.js 5 | Authentication | Upgrade from 4, better App Router support |
| React 19 | UI framework | Latest stable |
| Tailwind CSS 4 | Styling | Latest, faster builds |
| TypeScript 5 | Type safety | Consistent with server |

### Database Schema (Production)

```
┌──────────────────┐      ┌──────────────────┐
│      User        │      │     Project      │
│──────────────────│      │──────────────────│
│ id (uuid)        │─────<│ userId           │
│ githubId         │      │ id (uuid)        │
│ email            │      │ repoUrl          │
│ name             │      │ framework        │
│ avatarUrl        │      │ defaultLocale    │
│ createdAt        │      │ targetLocales[]  │
│ updatedAt        │      │ createdAt        │
└──────────────────┘      │ updatedAt        │
                          └────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│       Job        │  │  SourceString    │  │  GlossaryEntry   │
│──────────────────│  │──────────────────│  │──────────────────│
│ id (uuid)        │  │ id (uuid)        │  │ id (uuid)        │
│ projectId        │  │ projectId        │  │ projectId        │
│ status (enum)    │  │ hash (sha256)    │  │ sourceText       │
│ locales[]        │  │ sourceText       │  │ targetLocale     │
│ prUrl            │  │ filePath         │  │ translation      │
│ previewUrl       │  │ nodeType         │  │ caseSensitive    │
│ error            │  │ context          │  │ createdAt        │
│ logs (json)      │  │ createdAt        │  └──────────────────┘
│ metadata (json)  │  │ updatedAt        │
│ createdAt        │  └────────┬─────────┘
│ updatedAt        │           │
└──────────────────┘           ▼
                    ┌──────────────────┐
                    │   Translation    │
                    │──────────────────│
                    │ id (uuid)        │
                    │ sourceStringId   │
                    │ targetLocale     │
                    │ translatedText   │
                    │ provider         │
                    │ confidence       │
                    │ reviewStatus     │
                    │ reviewedBy       │
                    │ createdAt        │
                    │ updatedAt        │
                    └──────────────────┘

┌──────────────────────────────┐
│    TranslationMemory         │
│  (cross-project, global)     │
│──────────────────────────────│
│ id (uuid)                    │
│ hash (sha256)                │
│ sourceText                   │
│ sourceLocale                 │
│ targetLocale                 │
│ translatedText               │
│ provider                     │
│ confidence                   │
│ usageCount                   │
│ createdAt                    │
│ updatedAt                    │
└──────────────────────────────┘
```

### Adapter Interface (Contract)

Every framework adapter must implement this interface:

```
FrameworkAdapter {
  name: string                              // e.g., "nextjs-app-router"
  detect(deps, filePaths): DetectionResult  // Does this repo use this framework?
  getEntryPoint(filePaths): string          // Where is the root layout/app file?
  extractStrings(sandbox, workDir): SourceString[]  // Babel AST extraction
  injectRuntime(sandbox, workDir, config): ModifiedFile[]  // Write i18n runtime
  generateRouting(sandbox, workDir, locales): ModifiedFile[]  // URL routing + SEO
  getCommitFiles(workDir): FileChange[]     // What files to include in the PR
}
```

### Translation Provider Interface (Contract)

Every translation provider must implement this interface:

```
TranslationProvider {
  name: string                              // e.g., "deepl", "google", "openai"
  translate(request: TranslateRequest): TranslateResponse
  batchTranslate(requests: TranslateRequest[]): TranslateResponse[]
  isAvailable(): boolean                    // Health check
  estimateCost(wordCount: number, targetLocale: string): CostEstimate
}
```

---

## Chunk Breakdown

### Overview

The implementation is divided into 14 chunks, ordered by dependency and logical progression. Each chunk builds on the previous ones. No chunk should be started until its predecessors are complete and tested.

```
FOUNDATION
  Chunk 1:  Project Scaffolding & Monorepo Setup
  Chunk 2:  Database Schema & Prisma Models
  Chunk 3:  Authentication & User Management

CORE ENGINE
  Chunk 4:  Framework Adapter Registry & Detection System
  Chunk 5:  String Extraction Engine (Babel AST)
  Chunk 6:  Translation Provider Router & Interface
  Chunk 7:  Custom Translation Engine (TM, Glossary, Multi-Backend)

RUNTIME & DELIVERY
  Chunk 8:  Runtime Generator & Injection System
  Chunk 9:  URL Routing & SEO (hreflang, sitemap)
  Chunk 10: Sandbox Execution Abstraction (E2B + Docker)

PIPELINE & STREAMING
  Chunk 11: Orchestration Pipeline & Job Management
  Chunk 12: Git Delivery (Branch, Commit, PR)
  Chunk 13: Real-Time SSE Streaming & Progress Tracking

CLIENT & INTEGRATION
  Chunk 14: Client Application (Dashboard, Job View, Settings)
```

---

### Chunk 1: Project Scaffolding & Monorepo Setup

- [ ] **Complete**

**What:** Set up the production monorepo structure, configure both client and server projects with updated dependencies, establish shared tooling (linting, formatting, TypeScript), and configure the development environment.

**Why:** Every subsequent chunk depends on a clean, well-configured project foundation. The MVP's structure is our starting point, but we need to upgrade versions (Next.js 15, NextAuth 5, Tailwind 4, NestJS 11), establish proper module boundaries, and set up the development workflow.

**How it connects:** This chunk produces the empty shell that all other chunks fill. Framework adapters (Chunk 4), the translation engine (Chunk 7), and the pipeline (Chunk 11) all live within the module structure established here.

**Key considerations:**
- Preserve monorepo pattern (`/client` + `/server`) from MVP
- Upgrade all dependencies to latest stable versions
- Establish shared TypeScript config conventions
- Configure environment variable management
- Set up development scripts (dev, build, test, lint)
- Configure Neon PostgreSQL connection
- Establish error handling patterns (global filters, exception classes)
- Set up Swagger/OpenAPI documentation scaffolding

**Testing strategy:**
- Both client and server start without errors
- TypeScript compiles cleanly with strict mode
- Linting passes with zero warnings
- Environment variables load correctly
- Health check endpoint responds
- Database connection establishes successfully

**Edge cases:**
- Missing environment variables should fail fast with clear error messages
- Node version mismatch detection
- Port conflicts on development startup

---

### Chunk 2: Database Schema & Prisma Models

- [ ] **Complete**

**What:** Design and implement the full production database schema with Prisma, covering all entities needed for multi-user SaaS operation: Users, Projects, Jobs, SourceStrings, Translations, TranslationMemory, and GlossaryEntries.

**Why:** The MVP has a single `Job` table. The production system needs a relational model that supports user ownership, project-level configuration, cross-project translation memory, and the translation lifecycle (source → translate → review → approve).

**How it connects:** Every service in the system reads from or writes to this schema. The adapter system (Chunk 4) creates SourceStrings. The translation engine (Chunk 7) creates Translations and TM entries. The pipeline (Chunk 11) manages Jobs. The client (Chunk 14) displays all of it.

**Key considerations:**
- Schema design must support the full BLUEPRINT data model
- Migration strategy from MVP schema (if migrating existing data)
- Indexing strategy for performance (hash lookups, locale filtering)
- JSON fields for flexible metadata (job logs, extraction context)
- Enum types for statuses (JobStatus, ReviewStatus, TranslationProvider)
- Prisma service with NestJS lifecycle hooks (onModuleInit, onModuleDestroy)
- Seed scripts for development data

**Testing strategy:**
- Migrations run cleanly on empty database
- All CRUD operations work for each model
- Unique constraints enforce data integrity (e.g., one translation per source+locale)
- Cascade deletes work correctly (delete project → delete all related data)
- Index performance on hash-based TM lookups

**Edge cases:**
- SHA-256 hash collisions (astronomically unlikely but handle gracefully)
- Very long source strings (>10K chars) — column size limits
- Unicode normalization before hashing (NFC vs NFD)
- Concurrent writes to same translation record

---

### Chunk 3: Authentication & User Management

- [ ] **Complete**

**What:** Implement GitHub OAuth authentication for both client and server, user account creation/linking, session management, and authorization guards.

**Why:** The MVP uses GitHub OAuth but has no user model — the token is used ephemerally. The production system needs persistent user accounts linked to GitHub identities, with proper session management and route protection.

**How it connects:** Authentication gates every user-facing feature. The User model (Chunk 2) stores identity. Projects (Chunk 2) belong to users. Jobs (Chunk 11) are scoped to user/project. The client (Chunk 14) renders user-specific data.

**Key considerations:**
- Upgrade NextAuth from v4 to v5 (Auth.js)
- GitHub OAuth scopes: `read:user`, `user:email`, `repo` (for PR creation)
- JWT strategy with GitHub token embedded for server-side GitHub API calls
- NestJS AuthGuard that validates JWT and extracts user identity
- User creation on first login (upsert pattern)
- Session refresh and token expiry handling
- Protected vs public routes (server-side and client-side)

**Testing strategy:**
- OAuth flow completes end-to-end (login → callback → session)
- User record created on first login
- Subsequent logins link to existing user
- Protected API routes reject unauthenticated requests (401)
- Protected API routes reject requests for other users' resources (403)
- Session persists across page reloads
- Expired sessions redirect to login

**Edge cases:**
- GitHub token revocation mid-session
- User changes GitHub username
- Multiple browser tabs with same session
- OAuth callback with invalid state parameter

---

### Chunk 4: Framework Adapter Registry & Detection System

- [ ] **Complete**

**What:** Build the plugin-based framework adapter registry that auto-detects which React framework a repository uses and loads the correct adapter. Implement the adapter interface and the first adapter (Next.js App Router).

**Why:** The MVP hardcodes Next.js App Router detection. The production system needs a registry pattern where each framework registers itself, and the engine automatically selects the right one. This enables community-contributed adapters without modifying core code.

**How it connects:** The adapter is the brain of framework-specific logic. It's invoked by the orchestration pipeline (Chunk 11) at multiple stages: detection, extraction (Chunk 5), runtime injection (Chunk 8), and routing generation (Chunk 9). Each adapter bundles all framework knowledge into one cohesive unit.

**Key considerations:**
- Define the `FrameworkAdapter` interface with all required methods
- Build the adapter registry (register, detect, get)
- Detection priority: most specific adapter wins (App Router before generic Next.js)
- First adapter: Next.js App Router (port from MVP, production-grade)
- Second adapter: Next.js Pages Router (minimal delta from App Router)
- Third adapter: Vite + React (different entry point, same extraction)
- Fourth adapter: Remix (loader function handling)
- Detection logic: `package.json` deps + file tree patterns
- Each adapter is a self-contained module (NestJS module pattern)

**Testing strategy:**
- Correctly detects Next.js App Router from package.json + app/layout.tsx
- Correctly detects Next.js Pages Router from package.json + pages/_app.tsx
- Correctly detects Vite + React from package.json + src/main.tsx
- Correctly detects Remix from package.json + app/root.tsx
- Returns "unknown" for non-React frameworks (Vue, Svelte, Angular)
- Registry rejects duplicate adapter names
- Priority ordering works when multiple adapters match

**Edge cases:**
- Repos with both `app/` and `pages/` directories (hybrid Next.js)
- Monorepos with multiple frameworks
- Missing or malformed package.json
- Custom directory structures (non-standard entry points)
- Framework version-specific behavior (Next.js 13 vs 14 vs 15)

---

### Chunk 5: String Extraction Engine (Babel AST)

- [ ] **Complete**

**What:** Build the production-grade Babel AST string extraction system that scans .tsx/.jsx files and identifies every user-facing string, filtering out non-translatable content.

**Why:** String extraction is the foundation of the entire pipeline — if we miss strings, users see untranslated content; if we over-extract, we waste translation budget on code identifiers. The MVP's extractor works but needs production hardening: better filtering, context preservation, and duplicate handling.

**How it connects:** This is called by every framework adapter's `extractStrings()` method (Chunk 4). The extracted strings become SourceString records (Chunk 2) and are passed to the translation provider (Chunk 6). The change detector (Chunk 11) diffs extracted strings against previous runs.

**Key considerations:**
- Babel parser configuration: JSX, TypeScript, decorators support
- AST node types to extract: JSXText, JSXAttribute (placeholder, alt, title, aria-label), JSXExpressionContainer (string literals), template literals (no interpolation)
- Filtering rules: skip URLs, CSS classes, camelCase identifiers, CONSTANT_CASE, code keywords, single characters, symbols, import paths
- Context preservation: file path, line number, parent component name
- Deduplication: same string in multiple files → one SourceString, multiple locations
- SHA-256 hashing for stable identification
- Batch processing: handle repos with 1000+ .tsx files
- Fallback: 5-pass regex scanning if Babel parse fails on a file
- Performance: stream results rather than holding entire AST in memory

**Testing strategy:**
- Extracts simple JSXText: `<h1>Welcome</h1>` → `"Welcome"`
- Extracts string attributes: `placeholder="Email"` → `"Email"`
- Extracts JSX expressions: `{"Build fast"}` → `"Build fast"`
- Extracts template literals: `` `Hello world` `` → `"Hello world"`
- Skips URLs: `href="https://example.com"` → not extracted
- Skips CSS classes: `className="flex items-center"` → not extracted
- Skips camelCase: `onClick` → not extracted
- Skips code keywords: `"use client"` → not extracted
- Handles TypeScript syntax (generics, enums, type assertions)
- Handles files that fail to parse (fallback to regex)
- Deduplicates identical strings across files
- Produces consistent SHA-256 hashes after normalization

**Edge cases:**
- Strings with HTML entities (`&amp;`, `&lt;`)
- Strings with embedded JSX expressions (`Hello {name}!` — extract static parts only)
- Multi-line JSXText with leading/trailing whitespace
- Conditional expressions: `{isOpen ? "Open" : "Closed"}` — extract both
- String concatenation: `{"Hello" + " " + "World"}` — extract if possible
- Dynamic imports and lazy-loaded components
- Files with syntax errors (graceful degradation)
- Very large files (>5000 lines)

---

### Chunk 6: Translation Provider Router & Interface

- [ ] **Complete**

**What:** Build the translation provider interface, the provider router with fallback chain logic, and implement the first set of concrete providers (Google Translate, DeepL, OpenAI GPT-4).

**Why:** The MVP depends solely on Lingo.dev — if it's down, everything breaks. The production system needs a provider-agnostic interface with configurable priority, automatic fallback, and support for multiple backends.

**How it connects:** The translation provider is called by the orchestration pipeline (Chunk 11) after string extraction (Chunk 5). Results are stored as Translation records (Chunk 2). The custom translation engine (Chunk 7) wraps this router with TM/glossary/scoring layers.

**Key considerations:**
- Define the `TranslationProvider` interface (translate, batchTranslate, isAvailable, estimateCost)
- Build the provider router: configurable priority chain with automatic fallback
- Chunking logic: batch strings into groups of 50 for API calls
- Retry logic with exponential backoff per provider
- Provider implementations: Google Translate API, DeepL API, OpenAI GPT-4
- Lingo.dev provider (for backward compatibility with MVP)
- Cost tracking per provider per request
- Rate limiting awareness (respect provider quotas)
- Error categorization: retryable (rate limit, timeout) vs fatal (auth failure, unsupported language)

**Testing strategy:**
- Each provider translates a known string correctly
- Provider router falls back when primary provider fails
- Batch translation splits large sets into chunks of 50
- Rate limit errors trigger retry with backoff
- Authentication errors fail immediately (no retry)
- Cost estimation returns reasonable values
- All providers handle RTL languages (Arabic, Hebrew)
- Router respects configured priority order

**Edge cases:**
- Provider API returns partial results (some strings translated, some failed)
- Provider returns empty string for a translation
- Very long strings that exceed provider character limits
- Languages not supported by a specific provider (fallback should handle)
- Network timeout during batch translation (resume from last successful chunk?)
- Concurrent translation requests to same provider (rate limit coordination)

---

### Chunk 7: Custom Translation Engine (TM, Glossary, Multi-Backend)

- [ ] **Complete**

**What:** Build the custom translation engine that wraps the provider router (Chunk 6) with translation memory, glossary management, confidence scoring, and a human review queue.

**Why:** This is the compounding moat described in BLUEPRINT.md. Every translation that flows through the engine makes future translations faster and cheaper. TM eliminates redundant API calls. Glossary ensures brand consistency. Confidence scoring flags low-quality translations for review.

**How it connects:** The custom translation engine sits between the orchestration pipeline (Chunk 11) and the translation providers (Chunk 6). It intercepts every translation request, checks TM/glossary first, then routes to providers, then stores results. Over time, TM hit rates increase and API costs decrease.

**Key considerations:**
- 11-step translation pipeline from BLUEPRINT: normalise → hash → cache check → TM check → glossary → backend → fallback → fallback → score → review? → store
- Translation Memory: cross-project, keyed by (hash, sourceLocale, targetLocale)
- Glossary: per-project brand terms with exact-match replacement
- Confidence scoring: length ratio heuristic, back-translation check
- Human review queue: translations with confidence < 0.7 flagged
- TM usage tracking (count how many times each TM entry is reused)
- Batch optimization: check all TM hits before making any API calls
- Metrics: TM hit rate, average confidence, cost per string

**Testing strategy:**
- First translation of a string calls the provider API
- Second translation of same string (same or different project) hits TM (zero API calls)
- Glossary terms are preserved in translation output
- Confidence scoring produces reasonable values (0.0-1.0)
- Low-confidence translations are flagged for review
- TM usage count increments on each reuse
- Batch translation checks all TM entries before calling providers

**Edge cases:**
- Source text changes slightly ("Get Started" → "Get Started Now") — fuzzy match in TM?
- Glossary conflict with TM (TM has old translation, glossary says different)
- Very short strings (single word) — low confidence by default?
- Strings with variables/placeholders — TM matching with placeholders
- Concurrent translations of same string (race condition on TM write)

---

### Chunk 8: Runtime Generator & Injection System

- [ ] **Complete**

**What:** Build the system that generates i18n runtime files and injects them into the target repository. This includes the Language Provider (React Context), Language Switcher component, Text Translator (DOM walker), and the code modifications needed to wire everything together.

**Why:** Runtime injection is what makes the engine "zero-config" — the user doesn't need to modify their existing components. The engine generates all necessary runtime code and patches the entry point to wrap the app with the i18n provider.

**How it connects:** Each framework adapter (Chunk 4) calls the runtime generator with framework-specific parameters. The generated files are included in the Git commit (Chunk 12). The runtime loads locale files produced by the translation engine (Chunk 7).

**Key considerations:**
- Language Provider: React Context that holds current locale and translation map
- Language Switcher: configurable UI component (FAB, dropdown, or inline)
- Text Translator: DOM walker that replaces text nodes and translatable attributes
- Entry point patching: different strategy per framework (layout.tsx vs _app.tsx vs root.tsx vs main.tsx)
- Locale file loading: static import vs lazy fetch (configurable)
- Client-side locale detection: URL path → cookie → localStorage → Accept-Language → default
- Runtime should be zero-dependency (no external packages required)
- Generated code must be clean, readable, and maintainable (users will see it in PRs)

**Testing strategy:**
- Generated Provider wraps children correctly
- Generated Switcher renders all target locales
- Generated Translator replaces text nodes in DOM
- Entry point patching preserves existing layout structure
- Locale detection follows correct priority order
- Switching locale updates all visible text
- Generated code passes TypeScript strict mode
- Generated code passes ESLint rules

**Edge cases:**
- Entry point already has a context provider wrapper (nest correctly)
- Entry point uses non-standard export patterns
- App uses CSS-in-JS (styled-components, emotion) — Translator must not break styles
- App uses server components (Next.js) — runtime must be client-only
- App already has a `<html lang="en">` attribute — update, don't duplicate
- Multiple layout files (nested layouts in Next.js App Router)

---

### Chunk 9: URL Routing & SEO (hreflang, sitemap)

- [ ] **Complete**

**What:** Build the URL routing system that creates locale-prefixed URLs (`/fr/about`, `/de/pricing`) and generates proper SEO metadata (hreflang tags, html lang attribute, sitemap locale entries).

**Why:** Client-side-only locale switching (MVP approach) has zero SEO benefit. Production i18n requires each locale to have its own URL so search engines can index and rank each language version independently. This is where Weglot fails at scale — their proxy approach splits crawl budget.

**How it connects:** URL routing is framework-specific and implemented within each adapter (Chunk 4). The routing config is generated alongside the runtime (Chunk 8) and committed via Git (Chunk 12). SEO metadata is injected into the head of each page.

**Key considerations:**
- URL strategy: `/[locale]/...` prefix pattern (most SEO-friendly)
- Middleware generation: Next.js middleware.ts for locale detection and redirect
- hreflang tag generation: `<link rel="alternate" hreflang="fr" href="..." />`
- HTML lang attribute: `<html lang="fr">`
- x-default hreflang for the default locale
- Sitemap generation with locale-specific URLs
- 301 redirects (not 302) for canonical locale URLs
- Slug translation support (Phase 2 — flag for future)

**Testing strategy:**
- Middleware redirects `/about` to `/en/about` (or configured default)
- `/fr/about` serves French translations
- hreflang tags include all target locales + x-default
- HTML lang attribute matches current locale
- No duplicate hreflang entries
- 301 (permanent) redirects, not 302 (temporary)
- Generated middleware handles unknown locales gracefully

**Edge cases:**
- Existing middleware in the repo (must merge, not overwrite)
- Catch-all routes (`[...slug]`) — locale prefix must come first
- API routes should NOT be locale-prefixed
- Static assets (images, fonts) should NOT be locale-prefixed
- Root path `/` — redirect to default locale or serve directly?
- Trailing slashes consistency

---

### Chunk 10: Sandbox Execution Abstraction (E2B + Docker)

- [ ] **Complete**

**What:** Build an abstraction layer over execution environments that supports E2B (cloud) and Docker (self-hosted) as interchangeable backends. The orchestration pipeline should not know or care which backend is running.

**Why:** The MVP requires an E2B API key (paid service). For OSS self-hosting, users need a free alternative. Docker is universally available. The abstraction ensures the pipeline code is identical regardless of backend.

**How it connects:** The sandbox is used by every tool in the pipeline (Chunk 11): clone repo, read/write files, execute commands. The adapter system (Chunk 4) calls sandbox methods for extraction and injection. Git delivery (Chunk 12) reads files from the sandbox.

**Key considerations:**
- Define `SandboxProvider` interface: create, exec, readFile, writeFile, keepAlive, kill
- E2B provider: wraps existing E2B SDK (from MVP)
- Docker provider: uses Dockerode or child_process to manage containers
- Sandbox lifecycle: create → use → cleanup (guaranteed cleanup even on errors)
- Timeout handling: configurable per sandbox (default 10 minutes)
- File size limits for readFile/writeFile
- Error normalization: both backends return the same error types
- Resource tracking: active sandboxes map for cleanup on server shutdown

**Testing strategy:**
- E2B provider creates sandbox, executes command, reads/writes files, kills sandbox
- Docker provider does the same operations identically
- Pipeline produces identical results with either backend
- Sandbox cleanup occurs even when pipeline throws
- Timeout kills sandbox and returns error
- Concurrent sandboxes don't interfere with each other

**Edge cases:**
- Docker daemon not running (clear error message)
- E2B API key invalid or expired
- Sandbox runs out of disk space
- Command execution hangs indefinitely (timeout must kill)
- Large file reads (>10MB) — stream or reject?
- Network access from within sandbox (needed for npm install, git clone)

---

### Chunk 11: Orchestration Pipeline & Job Management

- [ ] **Complete**

**What:** Build the core orchestration pipeline that ties everything together: job creation, sequential tool execution, LLM-as-planner integration, change detection for re-runs, and error handling/recovery.

**Why:** This is the heart of the engine — the coordinator that invokes adapters, providers, sandbox, and git delivery in the correct order. The MVP's pipeline pattern (sequential tool forcing with LLM) is proven but needs production hardening: change detection, retry logic, partial recovery, and proper job lifecycle management.

**How it connects:** The pipeline orchestrates every other chunk: it uses the adapter (Chunk 4) for detection and extraction, the extractor (Chunk 5) for string scanning, the translation engine (Chunk 7) for translations, the runtime generator (Chunk 8) for injection, the routing system (Chunk 9), the sandbox (Chunk 10) for execution, and git delivery (Chunk 12) for output.

**Key considerations:**
- Job lifecycle: `pending` → `running` → `completed` / `failed` / `cancelled`
- Pipeline steps (from BLUEPRINT): clone → detect → extract → translate → inject → route → commit → preview
- Change detection for re-runs: hash-based diff (new/changed/deleted strings)
- LLM integration: Vercel AI SDK with configurable provider
- Sequential tool forcing: one tool at a time, LLM generates arguments only
- Error handling: fail fast, detailed error messages, cleanup on failure
- Abort support: cancel running job, kill sandbox
- Job metadata: word counts, string counts, TM hit rates, timing
- Rate limiting: prevent abuse (max concurrent jobs per user)
- Idempotency: re-running same job should be safe

**Testing strategy:**
- Full pipeline completes for a simple Next.js App Router repo
- Pipeline fails gracefully on unsupported framework
- Pipeline fails gracefully on existing i18n library conflict
- Change detection correctly identifies new strings on re-run
- Change detection correctly identifies deleted strings on re-run
- Cancel mid-pipeline stops execution and cleans up sandbox
- Job metadata is accurately recorded
- Concurrent jobs for different users don't interfere

**Edge cases:**
- Pipeline fails partway through — what state is the job in?
- Same repo submitted simultaneously by two users
- Very large repo (10,000+ files) — timeout handling
- Repo with no translatable strings
- Repo with only one file
- Network failure during git operations
- LLM API rate limit during pipeline

---

### Chunk 12: Git Delivery (Branch, Commit, PR)

- [ ] **Complete**

**What:** Build the git delivery system that creates a branch, commits all modified files atomically, and opens a pull request with a descriptive body.

**Why:** The output of the engine must be a clean, reviewable PR that a developer can inspect, modify, and merge. Atomic commits via Git Data API ensure no partial state. Descriptive PR bodies help reviewers understand what changed.

**How it connects:** Git delivery is the final step of the orchestration pipeline (Chunk 11). It receives the list of modified files from the adapter (Chunk 4) and runtime generator (Chunk 8). It uses the user's GitHub token from authentication (Chunk 3).

**Key considerations:**
- Git Data API for atomic commits (blob → tree → commit → ref)
- Branch naming: `locales/add-{locales}-{timestamp}` or configurable
- PR title and body generation: files changed, languages added, word counts, TM hit rate
- Handle repos where the default branch is `main` vs `master` vs custom
- Conflict detection: if branch already exists, handle gracefully
- File encoding: UTF-8 for all locale files, preserve existing encoding for modified files
- Commit message format: conventional commits or configurable
- PR labels and assignees (optional)

**Testing strategy:**
- Branch is created from latest commit on default branch
- All files are committed atomically (no partial commits)
- PR body includes accurate word counts and language list
- PR targets the correct default branch
- Handles repos with `main`, `master`, or custom default branches
- Existing branch name doesn't cause failure (append suffix or error)

**Edge cases:**
- User's GitHub token lacks `repo` scope (clear error)
- Repository has branch protection rules (PR creation succeeds, merge is gated)
- Very large number of files (>100) in single commit — API limits?
- Binary files in the changeset (locale files should all be text, but validate)
- Repo archived or read-only
- Network failure during multi-step Git Data API sequence (partial state?)

---

### Chunk 13: Real-Time SSE Streaming & Progress Tracking

- [ ] **Complete**

**What:** Build the server-sent events (SSE) streaming system for real-time pipeline progress, including the RxJS-based event emitter, event types, and reconnection handling.

**Why:** i18n processing takes 2-5 minutes. Users need real-time visibility into what's happening: which step is active, what strings were found, which translations succeeded, and when the pipeline completes. The MVP's SSE pattern is proven but needs production hardening.

**How it connects:** SSE events are emitted by every stage of the orchestration pipeline (Chunk 11). The client (Chunk 14) consumes events via `EventSource` to render the progress UI.

**Key considerations:**
- Event types: `log`, `progress`, `complete`, `error`, `heartbeat`
- RxJS ReplaySubject per job (late-joining clients replay all events)
- Event format: `{ type, data: { message, level, step, timestamp, metadata } }`
- Heartbeat events every 30s to keep connection alive
- Stream cleanup on job completion/failure/cancel
- Memory management: limit ReplaySubject buffer size
- CORS configuration for SSE endpoints
- Reconnection: client-side EventSource auto-reconnects, but needs `lastEventId` support

**Testing strategy:**
- SSE connection establishes and receives events
- Late-joining client receives all previous events (replay)
- Events arrive in correct order with accurate timestamps
- Heartbeat events prevent connection timeout
- Stream closes cleanly on job completion
- Multiple concurrent SSE connections to same job work correctly
- Memory is released when job completes

**Edge cases:**
- Client disconnects and reconnects mid-pipeline
- Server restarts while jobs are streaming (job recovery?)
- Very long-running job (>10 minutes) — does SSE stay alive?
- Hundreds of log events (buffer management)
- Client behind a proxy that buffers SSE events

---

### Chunk 14: Client Application (Dashboard, Job View, Settings)

- [ ] **Complete**

**What:** Build the full client application with Next.js 15: authentication pages, dashboard (new job, history, settings), job progress view with SSE streaming, and result display.

**Why:** The client is the user's interface to the engine. It must be intuitive, responsive, and provide clear feedback at every stage. The MVP's client is functional but basic — the production client needs polish, better error handling, and user account features.

**How it connects:** The client consumes every server-side API: authentication (Chunk 3), job management (Chunk 11), SSE streaming (Chunk 13). It renders data from the database (Chunk 2) and displays results from git delivery (Chunk 12).

**Key considerations:**
- Pages: Login, Dashboard (New Job / History / Settings tabs), Job Progress, Project Detail
- Components: RepoInputForm, LanguageSelector, LogStream, ProgressStepper, ResultCard, JobHistoryTab
- Hooks: useJobStream (SSE), useJobHistory (localStorage + API), useSettings, useAgentJob
- State management: React Context for auth, server state via SWR or React Query
- Responsive design: mobile-friendly dashboard
- Error states: clear messaging for every failure mode
- Loading states: skeleton screens, not spinners
- Accessibility: ARIA labels, keyboard navigation, screen reader support
- Settings: API key management (custom Groq, DeepL, Google, etc.)

**Testing strategy:**
- Login flow completes and redirects to dashboard
- New job submission sends correct payload to API
- Job progress page streams events in real-time
- Completed job shows PR URL and preview URL
- Failed job shows clear error message with guidance
- History tab shows previous jobs with correct statuses
- Settings persist across sessions (localStorage)
- Responsive layout works on mobile viewport

**Edge cases:**
- User submits same repo URL twice (warn or allow?)
- Very long repo URL in input field
- SSE connection drops — does UI recover?
- User navigates away and back — does progress resume?
- Browser tab becomes inactive — does SSE pause?
- Multiple jobs running simultaneously
- Empty job history state

---

## Cross-Cutting Concerns

These concerns apply across multiple chunks and should be addressed continuously:

### Error Handling Strategy

- **Server:** NestJS global exception filter, custom exception classes per domain (FrameworkNotSupportedError, TranslationProviderError, SandboxTimeoutError, etc.)
- **Client:** Error boundaries per page, toast notifications for recoverable errors, full-page error states for unrecoverable
- **Pipeline:** Fail fast on critical errors, retry on transient errors (rate limits, timeouts), detailed error messages in SSE events

### Logging & Observability

- Structured logging (JSON format) with correlation IDs per job
- Log levels: debug, info, warn, error
- Key metrics: job duration, string count, TM hit rate, translation cost, provider latency
- Health check endpoint with dependency status (DB, sandbox, providers)

### Security

- GitHub tokens: never logged, never stored in database, used only in memory
- API keys (Groq, DeepL, etc.): encrypted at rest if stored server-side, transmitted only via HTTPS
- Sandbox isolation: code execution in throwaway VMs, no access to host system
- Input validation: all API inputs validated with Zod/class-validator before processing
- Rate limiting: per-user, per-endpoint

### Performance

- Batch translation requests (50 strings per API call)
- TM lookups before any API calls (zero-cost translations)
- Lazy loading locale files in runtime (smaller initial bundle)
- Stream processing for large repos (don't hold 10K files in memory)
- Connection pooling for database (Prisma default)

---

## Glossary

| Term | Definition |
|---|---|
| **Adapter** | A plugin that encapsulates all framework-specific logic (detection, extraction, injection, routing) for one React framework |
| **AST** | Abstract Syntax Tree — the parsed representation of source code used by Babel to find strings |
| **Confidence Score** | A 0.0-1.0 rating of translation quality based on heuristics (length ratio, back-translation) |
| **Framework Detector** | The system that reads package.json and file structure to determine which React framework a repo uses |
| **Glossary** | A per-project list of brand terms that must never be mistranslated (e.g., "SwipePages" stays "SwipePages") |
| **hreflang** | An HTML tag that tells search engines which language version of a page to serve to users in each locale |
| **ICU MessageFormat** | A standard format for handling plurals, gender, and other locale-specific text patterns |
| **Locale** | A language/region identifier (e.g., `fr`, `de`, `pt-BR`, `zh-TW`) |
| **Orchestration** | The coordination of all i18n steps beyond translation: extraction, keying, routing, injection, SEO, sync |
| **Provider Router** | The system that routes translation requests through a priority chain of backends with automatic fallback |
| **ReplaySubject** | An RxJS Observable that buffers events and replays them to late-joining subscribers |
| **Sandbox** | An isolated execution environment (E2B VM or Docker container) where repo code runs safely |
| **Source String** | A user-facing string extracted from the codebase, identified by SHA-256 hash |
| **SSE** | Server-Sent Events — a one-way event streaming protocol from server to client over HTTP |
| **TM** | Translation Memory — a cross-project cache of previously translated strings, enabling zero-cost reuse |
| **TMS** | Translation Management System — enterprise tools like Phrase and Lokalise that manage translation workflow |

---

## Progress Tracker

| # | Chunk | Status | Notes |
|---|---|---|---|
| 1 | Project Scaffolding & Monorepo Setup | Not Started | |
| 2 | Database Schema & Prisma Models | Not Started | |
| 3 | Authentication & User Management | Not Started | |
| 4 | Framework Adapter Registry & Detection System | Not Started | |
| 5 | String Extraction Engine (Babel AST) | Not Started | |
| 6 | Translation Provider Router & Interface | Not Started | |
| 7 | Custom Translation Engine (TM, Glossary, Multi-Backend) | Not Started | |
| 8 | Runtime Generator & Injection System | Not Started | |
| 9 | URL Routing & SEO (hreflang, sitemap) | Not Started | |
| 10 | Sandbox Execution Abstraction (E2B + Docker) | Not Started | |
| 11 | Orchestration Pipeline & Job Management | Not Started | |
| 12 | Git Delivery (Branch, Commit, PR) | Not Started | |
| 13 | Real-Time SSE Streaming & Progress Tracking | Not Started | |
| 14 | Client Application (Dashboard, Job View, Settings) | Not Started | |
