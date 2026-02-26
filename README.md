# i18n Orchestration Engine

> Automate the 70% of internationalisation that isn't translation — string extraction, runtime injection, URL routing, SEO signals, and change sync — for every React-based framework, with any translation provider.

---

## Overview

This monorepo contains the full-stack application for the **i18n Orchestration Engine**, an open-source tool that automates the entire internationalisation pipeline for React-based web apps — from string extraction through to PR delivery.

| Directory | Stack | Purpose |
|---|---|---|
| [`client/`](./client) | Next.js 15 (App Router) | Dashboard UI |
| [`server/`](./server) | NestJS | Orchestration API & business logic |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Install

```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### Run in Development

Open two terminals:

```bash
# Terminal 1 — Client (http://localhost:3000)
cd client
npm run dev
```

```bash
# Terminal 2 — Server (http://localhost:3001)
cd server
npm run start:dev
```


---

## Project Structure

```
locales/
├── client/                  # Next.js App Router frontend
│   ├── src/
│   │   └── app/             # App Router pages & layouts
│   ├── next.config.ts
│   └── package.json
│
├── server/                  # NestJS backend
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── test/
│   ├── nest-cli.json
│   └── package.json
│
├── .gitignore               # Shared gitignore for both apps
├── BLUEPRINT.md             # Full product blueprint & architecture
└── README.md                # This file
```

---

## Architecture

The engine automates a 7-step pipeline that every i18n implementation requires:

```
STEP 1: EXTRACTION  ——→  Babel AST scans all .tsx/.jsx for user-facing strings
STEP 2: KEYING      ——→  Source text used as stable key (zero config)
STEP 3: TRANSLATION ——→  Routed to your chosen provider (DeepL, Google, GPT-4…)
STEP 4: STORAGE     ——→  Flat JSON locale files written to public/locales/
STEP 5: DETECTION   ——→  URL path → cookie → Accept-Language header
STEP 6: LOADING     ——→  Correct JSON file fetched at runtime
STEP 7: REPLACEMENT ——→  React Context + DOM walker swaps text in the UI
```

See [`BLUEPRINT.md`](./BLUEPRINT.md) for the full system design, competitive analysis, business model, and expansion roadmap.

---

## Contributing

This project follows an open-source core model. Framework adapters and translation provider integrations are designed as a plugin registry — adding a new framework or provider requires creating a single adapter file with no changes to the core engine.

---

## License

MIT
