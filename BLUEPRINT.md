# BLUEPRINT — i18n Orchestration Engine for React-Based Web Apps

> From hackathon MVP to the missing infrastructure layer for multilingual web development.

---

## Table of Contents

1. [Origin Story: From Hackathon MVP to Real Product](#1-origin-story)
2. [The Problem: The Orchestration Gap](#2-the-problem)
3. [Market Research: Who's Failing and Why](#3-market-research)
4. [How Internationalisation Works: The Universal Pipeline](#4-how-i18n-works)
5. [What We're Building: The Orchestration Engine](#5-what-were-building)
6. [Architecture: Components & System Design](#6-architecture)
7. [Scope: React-Based Frameworks Only (Phase 1)](#7-scope)
8. [Framework Adapter Strategy](#8-framework-adapters)
9. [Custom Translation Engine](#9-translation-engine)
10. [Business Model: Open-Source Core + Paid Cloud](#10-business-model)
11. [Competitive Landscape & Positioning](#11-competitive-landscape)
12. [Expansion Roadmap](#12-expansion-roadmap)
13. [Key Decisions & Trade-offs](#13-key-decisions)

---

## 1. Origin Story

### The Hackathon MVP — LingoAgent

LingoAgent was built as a hackathon project to prove a single hypothesis: **Can an AI agent fully automate internationalisation for an existing web app — from repo to PR — in minutes instead of weeks?**

**What the MVP does:**
- Takes a GitHub repo URL + target languages
- Spins up a cloud sandbox (E2B)
- Clones the repo, extracts all user-facing strings via Babel AST
- Translates everything via Lingo.dev SDK
- Injects a zero-dependency i18n runtime (React Context + DOM walker)
- Opens a GitHub PR with all changes
- Deploys a Vercel preview of the multilingual site
- Streams real-time progress via SSE

**What the MVP proved:**
- The orchestration pipeline works end-to-end for Next.js App Router repos
- AI can reliably extract 95%+ of user-facing strings without any code changes
- The entire process (clone → extract → translate → PR → preview) takes 2-5 minutes vs 2-6 weeks manually
- No human developer intervention needed — it's a single-click automation

**What the MVP is NOT:**
- Not multi-framework (Next.js App Router only)
- Not multi-provider (Lingo.dev only, breaks if API is down)
- Not production-grade i18n (no URL routing, no hreflang SEO, no pluralisation)
- Not a business yet (no user accounts, no translation memory, no collaboration)

### The Vision — Where It Goes

The MVP validated the technical approach. The real product is an **i18n Orchestration Engine** — an open-source core that automates the entire internationalisation pipeline for any React-based web app, with a paid cloud layer for translation memory, team collaboration, and analytics.

**The goal in one sentence:**
> Automate the 70% of internationalisation that isn't translation — string extraction, runtime injection, URL routing, SEO signals, and change sync — for every React-based framework, with any translation provider.

---

## 2. The Problem

### What Most People Think i18n Is

"Just translate the text." — Every founder, product manager, and growth lead.

### What i18n Actually Is

A 7-step pipeline where translation (the part everyone focuses on) is only 30% of the work:

```
STEP 1: EXTRACTION ——→ Find every user-facing string in the codebase
STEP 2: KEYING ———→ Create stable identifiers for each string
STEP 3: TRANSLATION ——→ Convert strings to target languages
STEP 4: STORAGE ———→ Save translations as structured files
STEP 5: DETECTION ——→ Determine which language the user wants
STEP 6: LOADING ———→ Fetch the right translation file at runtime
STEP 7: REPLACEMENT —→ Swap original text with translated text in the UI
```

**Translation (Step 3) is commoditised.** Google Translate, DeepL, and GPT-4 all do it well enough. The other 6 steps — the orchestration — are where every team gets stuck.

### The Orchestration Gap

Every platform and framework fails at the orchestration steps, not the translation step:

| Platform | Translation? | Extraction? | URL Routing? | SEO (hreflang)? | Change Sync? |
|---|---|---|---|---|---|
| Webflow | Manual | Manual | Subfolder only, 302 redirects | Forced on all pages, causes Ahrefs errors | Manual |
| Framer | AI-powered | Page-by-page, manual trigger | No slug translation | Basic hreflang present | No change detection |
| Wix | Auto-translate | Breaks on dynamic/Velo content | Platform-controlled | Misconfigured on edge cases | Manual |
| Shopify | Translate & Adapt | Misses third-party app strings | No URL handle translation | Basic | Character-capped |
| Landing page builders (SwipePages, Unbounce, Instapage, Leadpages) | None | None | None | None | None |
| Next.js / React (DIY) | Developer picks provider | 20-30 hours manual extraction | Developer builds from scratch | Developer implements | Developer maintains |

**The gap:** No tool automates the end-to-end orchestration (extract → translate → inject → route → SEO → sync) for existing codebases. Every tool assumes someone else already did the hard parts.

---

## 3. Market Research

### Market Size

| Segment | Size (2024) | Growth |
|---|---|---|
| Language Services (total) | $71.7B | ~6% annually |
| Translation Management Systems (TMS) | $2.16B | 17.2% CAGR to 2030 |
| Software Localisation | $4.9B | 12.4% CAGR to 2034 |

**Our addressable market (developer tooling, SMB-to-mid-market):** $400-800M of the software localisation segment.

### Platform-Specific Gap Analysis

**Webflow (493K+ active sites, $9+/mo localisation tier):**
- 302 redirects for locale routing (not 301) — kills SEO link equity
- Forces hreflang tags on ALL pages, even untranslated — Ahrefs/SEMrush report critical errors
- CMS internal links don't localise — `/about` never becomes `/de/about`
- No subdomain support, no custom domain per locale
- No auto-translation — manual or external

**Framer (400% growth, AI-powered localisation):**
- No URL slug translation — `/about` stays `/about` across all locales
- Page-by-page manual trigger — no automatic change detection
- $40/locale scaling cost pushes teams to alternatives at 3+ locales

**Shopify (4.8M merchants, Translate & Adapt):**
- Third-party app content invisible to T&A
- Product URL handles not translatable
- 100M character/year auto-translation cap
- Headless Hydrogen requires building i18n from scratch

**WordPress WPML/Polylang (43.3% of all websites):**
- WPML bloats database by 15-30%, TTFB +8-12%
- Plugin incompatibility with WooCommerce product types
- No automatic sync when content updates

### The Engineering Cost of DIY i18n

- **Retrofitting i18n** into an existing React app: 2-6 weeks of engineering time
- **i18n retrofits add 20-30% extra workload** vs building i18n-first
- **String extraction alone:** 20-30 hours for a typical codebase
- **Weglot at scale (6 languages, 1 year):** ~$4,000/year with SEO risk
- **TMS setup (Lokalise):** $1,680/year + 40 hours setup + 10 hrs/month ongoing

### The "Weglot Trap"

Weglot is the most popular quick-fix. How it works: JavaScript/proxy intercepts the page, replaces strings client-side or via server-side rendering.

**Why teams eventually rip it out:**
- Translated content loaded via JS — not always crawlable by Google
- Proxy-based delivery splits crawl budget across subdirectories the team doesn't control
- Pricing scales with word count — medium stores hit $329-699/month
- No deep integration with CMS or framework internals
- Teams hit SEO audits showing ranking damage at 500K+ monthly visitors

**The arbitrage:** Weglot proved teams will pay $329-699/month for translation tooling. But teams that outgrow Weglot have nowhere to go. That's our wedge.

### Will AI Builders Kill This Opportunity?

**No. The opposite — they're a tailwind.**

- **Framer AI** translates text but doesn't fix URL slugs, doesn't detect dynamic content, doesn't re-trigger on copy changes
- **Wix AI** generates sites in English; multilingual is a separate manual workflow bolted on after generation
- **v0/Cursor** generates standard React components with zero i18n by default
- **WordPress still powers 43.3% of websites.** It's not going anywhere.
- **The more AI generates websites, the more websites exist that need localisation.**

The retrofit market for 1.9 billion existing websites is generationally durable. AI-native builders serve the top 5% of new sites. The other 95% needs orchestration help.

---

## 4. How Internationalisation Works

### The Universal 7-Step Pipeline

Every i18n implementation — regardless of framework, library, or tool — follows these exact same steps:

**BUILD TIME (automated, runs once or on content change):**

**Step 1 — EXTRACTION: Find the strings**
Scan the codebase and identify every user-facing string: button labels, headings, placeholder text, alt attributes, error messages.

Three approaches exist:
- **AST (Abstract Syntax Tree):** Parse code like a compiler, walk every node. ~95% accuracy, zero code changes needed. This is our approach.
- **Regex scan:** Pattern match for `t('...')` or `$t('...')` calls. ~60% accuracy, requires wrapping strings manually first.
- **Manual wrapping:** Developer marks every string explicitly with `t()` or `defineMessages()`. 100% accuracy, enormous manual effort.

**Step 2 — KEYING: Name each string**
Every extracted string needs a stable identifier so the app can look up the right translation.
- **Source text as key** (our approach): `"Get Started"` maps to `"Commencer"` — zero configuration, breaks if source text changes
- **Manual keys** (next-intl, i18next): `"nav.cta.button"` maps to `"Commencer"` — stable, requires manual assignment
- **Auto-generated hash** (Lingui): SHA-256 of source text — stable and automatic but unreadable

**Step 3 — TRANSLATION: Convert to target languages**
Call a translation backend (Google Translate, DeepL, GPT-4, or human translator) with the source strings and target locale. This is the commoditised step — AI does it well.

**Step 4 — STORAGE: Save as files**
Write one JSON file per language to a predictable location (e.g., `public/locales/fr.json`). Format options: flat JSON, nested JSON, ICU MessageFormat, PO/POT, XLIFF. Flat JSON is simplest for automated tooling.

**RUNTIME (runs in the browser on every page load):**

**Step 5 — DETECTION: What language does this user want?**
Check in order: URL path (`/fr/pricing`) → cookie/localStorage → browser `Accept-Language` header → fallback to default.

Two architectures:
- **URL-based routing** (production-grade): `/en/about`, `/fr/about` — each locale has its own URL. Best for SEO. Requires middleware.
- **Client-side only** (MVP/landing pages): Same URL, locale stored in localStorage. Fast to implement, zero SEO benefit.

**Step 6 — LOADING: Fetch the right file**
Once locale is known, load the corresponding JSON file. Can be statically imported at build time (larger bundle, instant) or lazy-fetched on demand (smaller bundle, slight delay on switch).

**Step 7 — REPLACEMENT: Show the translated text**
Swap original strings with translated ones in the UI. Three mechanisms:
- **React Context + hooks:** `const {t} = useTranslations(); t('key')` — standard approach
- **DOM walker:** Walk rendered DOM nodes and replace text — works on any existing site, zero code changes
- **Compile-time replacement:** Strings baked into separate builds per locale — best performance, most complex

### What Current Tools Do vs Don't Do

| Tool | Steps Covered | Steps Missing |
|---|---|---|
| **Weglot** | 3 (translate), 5-7 (detect/load/replace via proxy) | 1 (extraction incomplete), 4 (no file generation), SEO compromised |
| **Phrase / Lokalise** | 3 (translate), 4 (file management) | 1 (assumes strings pre-extracted), 2 (assumes keys exist), 5-7 (no runtime) |
| **next-intl / i18next** | 5 (detection), 6 (loading), 7 (replacement) | 1 (extraction manual), 3 (bring your own translator) |
| **Our Orchestration Engine** | **ALL 7 STEPS** | None — full pipeline automation |

---

## 5. What We're Building

### The i18n Orchestration Engine

A tool that automates the entire 7-step i18n pipeline for any React-based web app:

1. **Connect** — Point it at a GitHub repo (or paste a URL)
2. **Detect** — Auto-identify the framework (Next.js, Remix, Vite+React, etc.)
3. **Extract** — Babel AST scans all .tsx/.jsx files, finds every user-facing string
4. **Translate** — Routes strings through your chosen translation provider (own engine, DeepL, Google, GPT-4, Lingo.dev, Lokalise, or Phrase)
5. **Inject** — Generates the i18n runtime, URL routing config, hreflang metadata, and locale files
6. **Deliver** — Opens a GitHub PR with all changes, optionally deploys a preview
7. **Sync** — On subsequent runs, detects new/changed/deleted strings and updates only what changed

### What Makes It Different

**vs Weglot:** No proxy, no JS overlay, no SEO risk. Changes live in your codebase as real files.

**vs Phrase/Lokalise/Crowdin:** Those are Translation Management Systems — they manage the workflow *after* strings are extracted. We automate the extraction, injection, and routing that they assume someone already did.

**vs next-intl/i18next/react-intl:** Those are runtime libraries. They provide the hooks and context for rendering translations. We generate the configuration, extract the strings, and create the translation files that those libraries consume.

**vs doing it manually:** 2-5 minutes vs 2-6 weeks. One command vs touching every file in your codebase.

### The Three-Layer Product

```
LAYER 3: PAID CLOUD
  Dashboard, team collaboration, analytics, human review workflow,
  translation memory across projects, glossary management, usage billing

LAYER 2: ORCHESTRATION ENGINE (open-source core)
  Framework detection → String extraction → Translation routing →
  Runtime injection → URL routing → SEO signals → Git delivery
  Adapter registry for frameworks + translation providers

LAYER 1: CUSTOM TRANSLATION ENGINE
  String database, translation memory (TM), glossary,
  multi-backend pipeline (Google → DeepL → GPT-4 fallback chain),
  confidence scoring, human review queue
```

---

## 6. Architecture

### System Overview

```
USER: "Internationalise my React app to French, Arabic, and Japanese"
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION ENGINE                          │
│                                                                 │
│  1. Clone repo into sandboxed environment                       │
│  2. Read package.json + file structure                          │
│  3. Framework Detector:                                         │
│       "next" in deps + app/layout.tsx → Next.js App Router      │
│       "@remix-run/react" in deps → Remix                        │
│       "react" + "vite" → Vite + React                           │
│       "react" + pages/_app.tsx → Next.js Pages Router           │
│                                                                 │
│  4. Load the correct Framework Adapter                          │
│  5. Adapter.extractStrings() → Babel AST scans all .tsx/.jsx    │
│  6. Translation Provider routes strings to chosen backend       │
│  7. Adapter.injectRuntime() → Writes i18n runtime + config      │
│  8. Adapter.generateRouting() → URL routing + hreflang          │
│  9. Git: commit all changes → push → open PR                   │
│ 10. Optional: trigger preview deployment                        │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components to Build

**Component 1 — Framework Detector**
Reads `package.json` dependencies and scans the file tree to auto-detect which React framework the repo uses. Returns the right adapter.

**Component 2 — Framework Adapters (one per framework)**
Each adapter knows:
- How to detect this framework (dependency signature + file patterns)
- Where the entry point is (`app/layout.tsx` vs `app/root.tsx` vs `src/main.tsx`)
- How to extract strings (same Babel AST for all React-based frameworks)
- How to inject the i18n runtime (different component syntax per framework)
- How to set up URL routing (middleware vs config vs React Router)
- What files to commit

**Component 3 — String Extractor (Babel AST)**
Parses every .tsx/.jsx file using `@babel/parser` and `@babel/traverse`. Walks the AST tree and collects:
- JSXText nodes: `<h1>Welcome</h1>` → `"Welcome"`
- String attributes: `placeholder="Email"` → `"Email"`
- JSX expressions: `{"Build fast"}` → `"Build fast"`
- Template literals (no interpolation): `` `Hello world` `` → `"Hello world"`

Filters out non-translatable content: URLs, camelCase identifiers, code keywords, symbols, single characters.

Falls back to 5-pass regex scanning if Babel fails.

**Component 4 — Translation Provider Router**
Routes translation requests to the configured backend. Supports multiple providers behind a unified interface. Handles chunking (50 strings per batch), retry logic, and error handling.

Provider priority (configurable): Custom Engine → Lingo.dev → DeepL → Google Translate → GPT-4

**Component 5 — Runtime Generator**
Generates the i18n runtime files that get injected into the repo:
- **Language Provider** — React Context that holds the current locale and translation map
- **Language Switcher** — Floating UI component (FAB) with language dropdown
- **Text Translator** — DOM walker that replaces text nodes and translatable attributes at runtime
- **URL Routing Config** — Middleware + locale path config (framework-specific)
- **SEO Metadata** — hreflang tags, html lang attribute, sitemap configuration

**Component 6 — Change Detector (for re-runs)**
On subsequent runs, compares extracted strings against previously stored strings:
- NEW strings → send to translation
- DELETED strings → remove from locale files
- CHANGED strings → re-translate or fuzzy-match from translation memory
- UNCHANGED → skip (zero API calls)

**Component 7 — Git Delivery**
Uses GitHub's Git Data API (blob → tree → commit → ref) to atomically commit all changes. Creates a branch, opens a PR with a descriptive body (files changed, languages added, word counts), and optionally triggers a preview deployment.

**Component 8 — Custom Translation Engine (paid layer)**
A full translation backend with:
- **String Database:** Stores every extracted string with SHA-256 hash for deduplication
- **Translation Memory (TM):** Cross-project cache — if "Get Started" was already translated to French in another project, reuse it instantly (zero API calls)
- **Glossary:** Brand terms that must never be mistranslated (e.g., "SwipePages" stays "SwipePages" in all languages)
- **Multi-backend pipeline:** Try Google Translate first (cheapest), fall back to DeepL (higher quality), fall back to GPT-4 (best for marketing copy)
- **Confidence scoring:** Rate each translation 0-1 based on length ratio and back-translation heuristics
- **Human review queue:** Low-confidence translations flagged for manual review

### Adapter Registry Pattern

The engine uses a plugin registry — each framework adapter and translation provider registers itself at startup. Adding a new framework means creating one adapter file. No changes to the core engine.

```
Adapter Registry
  ├── Framework Adapters
  │   ├── Next.js App Router Adapter
  │   ├── Next.js Pages Router Adapter
  │   ├── Remix Adapter
  │   └── Vite + React Adapter
  │
  └── Translation Providers
      ├── Custom Engine Provider (default in cloud)
      ├── Lingo.dev Provider
      ├── DeepL Provider
      ├── Google Translate Provider
      ├── OpenAI GPT-4 Provider
      ├── Lokalise Provider
      └── Phrase Provider
```

---

## 7. Scope: React-Based Frameworks Only (Phase 1)

### Why React First?

The single Babel AST string extractor works for ALL React-based frameworks. One parser covers ~80% of the web framework market:

| Framework | Market Share | Babel Works? | Extra Effort |
|---|---|---|---|
| Next.js App Router | ~53% of meta-frameworks | Yes | Already built (MVP) |
| Next.js Pages Router | ~15% (legacy Next.js) | Yes | Different entry point only |
| Remix | ~2-3% | Yes | Different entry point + loader handling |
| Vite + React (plain) | ~10-15% | Yes | No standard file structure |
| **Total React coverage** | **~80%+** | **One parser** | **Mostly entry point differences** |

### What's Out of Scope (for now)

| Framework | Why Deferred | Parser Needed |
|---|---|---|
| Nuxt/Vue | Different template syntax (.vue SFCs) | `@vue/compiler-sfc` — separate parser |
| SvelteKit | Different template syntax (.svelte) | `svelte/compiler` — separate parser |
| Astro | Custom .astro format, islands architecture | `astro/compiler` or regex |
| Angular | Completely different model — compile-time XLIFF, not runtime JSON | `@angular/compiler` + `ng extract-i18n` |

These are Phase 2+ expansions. The React-based frameworks share one extractor and cover the majority of the market.

---

## 8. Framework Adapter Strategy

### What's the Same Across All React Frameworks

| Component | Shared? | Details |
|---|---|---|
| String extraction (Babel AST) | 100% shared | Same `@babel/parser` + `@babel/traverse` for all .tsx/.jsx |
| Translation pipeline | 100% shared | Same provider calls, chunking, error handling |
| Locale file generation | 100% shared | Same flat JSON output to `public/locales/` |
| Git commit + PR | 100% shared | Same GitHub Git Data API pattern |
| Change detection | 100% shared | Same hash-based comparison |

### What Changes Per Framework

| Component | Next.js App Router | Next.js Pages Router | Remix | Vite + React |
|---|---|---|---|---|
| **Detection signature** | `"next"` + `app/layout.tsx` | `"next"` + `pages/_app.tsx` | `"@remix-run/react"` + `app/root.tsx` | `"react"` + `"vite"` + `src/main.tsx` |
| **Entry point** | `app/layout.tsx` | `pages/_app.tsx` | `app/root.tsx` | `src/main.tsx` or `src/App.tsx` |
| **Runtime injection target** | Wrap children in layout | Wrap `<Component>` in `_app` | Wrap `<Outlet>` in root | Wrap `<App>` in createRoot |
| **URL routing** | Middleware (`middleware.ts`) | `next.config.js` i18n key | Middleware + loader context | React Router `/:locale/*` route |
| **Routing type** | File-based (`app/[locale]/`) | Config + getStaticProps | File-based + loaders | Manual (React Router v6) |
| **Build tool** | Turbopack/Webpack | Webpack | Vite | Vite |
| **hreflang injection** | `<head>` in layout | `<Head>` in `_document` | `<head>` in root | Custom `<Helmet>` or manual |

### Priority Order for Implementation

1. **Next.js App Router** — already done (MVP), 53% of meta-framework market
2. **Next.js Pages Router** — minimal delta from App Router (different entry point, same extraction)
3. **Vite + React** — same extraction, needs convention for entry point discovery
4. **Remix** — same extraction, needs loader function handling for server-side strings

---

## 9. Custom Translation Engine

### Why Build Our Own?

The MVP depends on Lingo.dev as the sole translation provider. This creates three problems:
1. **Single point of failure** — if Lingo.dev is down, the entire product is broken
2. **No data ownership** — every string flows through a third party
3. **No compounding moat** — translation memory doesn't accumulate in our system

### The Translation Pipeline (11 Steps)

```
Input: source string + source locale + target locale

 1. Normalise  → Trim, collapse whitespace
 2. Hash       → SHA-256 of normalised text
 3. Cache Hit? → Check existing Translation record (exact match)
 4. TM Hit?    → Check Translation Memory by (hash, source, target)
 5. Glossary   → Replace brand terms before sending to backend
 6. Backend    → Call Google Translate (cheapest, first try)
 7. Fallback   → If Google fails or quality < threshold → DeepL
 8. Fallback   → If DeepL fails → GPT-4 with translation-optimised prompt
 9. Score      → Confidence scoring (length ratio, heuristic checks)
10. Review?    → If confidence < 0.7 → queue for human review
11. Store      → Upsert Translation record + Translation Memory entry

Output: translated string + provider used + confidence score
```

### Data Model

- **Project** — one per repo (identified by repo URL)
- **SourceString** — every extracted string, SHA-256 hashed, deduplicated within project
- **Translation** — one per (source string, target locale), tracks provider and confidence
- **Translation Memory** — cross-project cache, keyed by (hash, source locale, target locale), tracks usage count
- **Glossary Entry** — per-project brand terms that must be preserved or specifically translated

### The Compounding Moat

Every translation that flows through the engine makes the next translation faster and cheaper:
- First time translating "Get Started" to French: API call ($0.001)
- Second time (same or different project): Translation Memory hit ($0.000)
- After 1000 projects: 60-80% of common UI strings are TM hits (near-zero translation cost)

---

## 10. Business Model

### Open-Source Core + Paid Cloud

Inspired by: Supabase, PlanetScale, Sentry, PostHog.

| Component | OSS (free) | Cloud (paid) |
|---|---|---|
| Orchestration engine | Yes | Yes |
| Framework adapters | Yes | Yes |
| Translation provider interface | Yes | Yes |
| Babel AST string extraction | Yes | Yes |
| Runtime generation | Yes | Yes |
| Git delivery (PR creation) | Yes | Yes |
| Custom Translation Engine | No | Yes |
| Translation Memory (cross-project) | No | Yes |
| Glossary management | No | Yes |
| Team collaboration | No | Yes |
| Analytics dashboard | No | Yes |
| Human review workflow | No | Yes |
| Priority support | No | Yes |

**OSS users:** Self-host, bring their own translation API keys (DeepL, Google, etc.), run Docker locally.

**Cloud users:** Managed hosting, built-in Translation Engine with TM and glossary, team features, pay per usage.

### Pricing Mental Model

- Weglot charges $329-699/month for proxy translation
- Lokalise charges $140+/month for TMS
- Our cloud: $49-199/month for full orchestration + translation + TM + team features
- Undercut Weglot on price, beat them on SEO quality. Undercut Lokalise on setup time (minutes vs weeks).

---

## 11. Competitive Landscape

### The Market Gap Map

```
                TRANSLATION ONLY              FULL ORCHESTRATION
                (words converted)             (extract + route + SEO + inject)

    High     Weglot ●                         ← NOBODY IS HERE →
    Quality  (proxy, quick,                    [Our Orchestration Engine]
             SEO risk at scale)

    Low      Manual work ●      Phrase/Lokalise ●
    Quality  (duplicate sites,  (enterprise TMS,
             40+ eng hours)     assumes strings pre-extracted,
                                $140+/mo, weeks to set up)
```

**Weglot** = quick and cheap, but it's a translation sticker on your window. SEO suffers at scale.

**Phrase/Lokalise** = proper enterprise tools, great translation workflow. But they assume a developer already extracted all strings and built i18n infrastructure. They don't help with the orchestration.

**Our engine** = automates the orchestration that Weglot skips and Phrase/Lokalise assume someone else already did.

### Key Players

| Player | Focus | Their Blind Spot |
|---|---|---|
| **Weglot** ($15-699/mo) | Proxy overlay translation | SEO risk, no deep framework integration |
| **Phrase** (enterprise) | TMS with CI/CD integration | Assumes pre-extracted strings, no no-code support |
| **Lokalise** ($140+/mo) | Developer-focused TMS | Same extraction assumption, high entry price |
| **Crowdin** ($50+/mo) | OSS community + enterprise | Same extraction blind spot |
| **next-intl / i18next** | Runtime library | No extraction, no translation, no orchestration |
| **Lingo.dev** | AI translation SDK + MCP | Translation only, no runtime injection or routing |

**Our positioning:**
> "Weglot solves translation. TMS tools solve workflow. We solve orchestration — the step every other tool assumes someone else already did."

---

## 12. Expansion Roadmap

### Phase 1 — React Frameworks (Current Focus)

- Next.js App Router (done in MVP)
- Next.js Pages Router
- Remix
- Vite + React
- Custom Translation Engine
- OSS core release

### Phase 2 — Additional Frameworks

- Nuxt 3 / Vue (requires `@vue/compiler-sfc` parser)
- SvelteKit (requires `svelte/compiler` parser)
- Astro (custom parser or regex)

### Phase 3 — No-Code Platform Connectors

- Shopify (Translations GraphQL API — most complete)
- Webflow (CMS API v2 — read/write content)
- Framer (no public API — CSV export/plugin approach)

### Phase 4 — Beyond Landing Pages

Sectors with the same orchestration gap:
- **SaaS web apps** — same React extraction, 10-100x more strings
- **Documentation sites** — Docusaurus/Mintlify have zero sync automation for translated Markdown
- **E-commerce** — product catalogues, transactional emails
- **Mobile app landing pages** — App Store/Play Store ASO localisation
- **Email templates** — Klaviyo, SendGrid multilingual templates

### Phase 5 — Enterprise & Scale

- Translation memory marketplace (cross-company shared TM)
- AI quality scoring + automatic human review routing
- CI/CD integration (GitHub Action that runs on every push)
- Real-time change detection (webhook on content update → auto re-translate)

---

## 13. Key Decisions & Trade-offs

### Decisions Made

| Decision | Choice | Reasoning |
|---|---|---|
| **Scope** | React-based frameworks only (Phase 1) | One Babel parser covers ~80% of web. Ship fast, expand later. |
| **Extraction approach** | Babel AST (implicit, zero code changes) | Competitive advantage — works on unmodified existing repos |
| **Translation file format** | Flat JSON (`{ "source": "translated" }`) | Simplest to diff, merge, and look up at runtime |
| **Keying strategy** | Source text as key | Zero configuration. Trade-off: breaks if source text changes (TM mitigates this) |
| **Runtime injection** | React Context + DOM walker | Zero external dependencies. Works without modifying existing components. |
| **Translation Engine** | Module within the server (not microservice) | Shared DB, in-process calls, no network latency. Extract to microservice if scaling demands it. |
| **Adapter system** | Plugin registry (not switch/case) | OSS extensibility — community can add adapters without modifying core |
| **Execution backend** | Abstracted (E2B for cloud, Docker for OSS) | E2B requires paid API key. Docker is universally available for self-hosting. |
| **Business model** | OSS core + paid cloud | Trust + distribution via OSS. Revenue from managed cloud + Translation Engine |

### Known Limitations (to address post-Phase 1)

| Limitation | Impact | Mitigation Path |
|---|---|---|
| No pluralisation support | Languages with complex plural rules (Arabic: 6 forms, Russian: 3 forms) get basic translation only | Add ICU MessageFormat support in Phase 2 |
| Source-text-as-key breaks on text changes | If "Get Started" becomes "Start Free Trial", old translations orphaned | Translation Memory + fuzzy matching resolves 80% of cases |
| No server-side rendering for translations | Translations loaded client-side — slight flash on initial load | Add SSR adapter for Next.js (server components) in Phase 2 |
| No RTL layout automation | Arabic/Hebrew text translates but layout doesn't flip | Generate `dir="rtl"` attribute + CSS logical properties in Phase 2 |
| Single sandbox per job | Can't parallelise extraction across files | Fine for repos < 1000 files. Parallelise within sandbox for larger repos. |

### Non-Goals (things we intentionally don't build)

- **CMS / content editor** — We're an engine, not a Notion/Webflow competitor
- **Human translation marketplace** — We route to existing providers (DeepL, Google, etc.)
- **Full TMS** — Phrase and Lokalise own enterprise translation workflow. We focus on the orchestration layer below them.
- **Mobile app i18n** — React Native, Flutter, Swift/Kotlin are fundamentally different (no DOM, different string formats). Separate product.
- **Angular support** — Compile-time XLIFF is architecturally incompatible with our runtime approach. Requires a separate product mindset.
