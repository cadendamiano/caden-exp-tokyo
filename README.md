# caden-exp-tokyo

Personal experiment, tinkering in progress.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
cp .env.local.example .env.local
# Fill in ANTHROPIC_API_KEY and GEMINI_API_KEY in .env.local
```

## Run (web)

```bash
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm start         # production server
```

## Run (Electron desktop app)

Prereqs: `npm install` has been run, and `.env.local` has real values for
`ANTHROPIC_API_KEY` and `GEMINI_API_KEY`. A `preflight` step enforces this
and fails fast with a clear message if anything is missing.

```bash
npm run electron:dev:fast   # daily loop — Next dev server + Electron, with HMR
npm run electron:dev        # full standalone build, then launch (prod-bundle smoke test)
npm run electron:dist       # package as a macOS .dmg + .zip
```

`electron:dev:fast` runs `next dev` on port 3100 and tells the Electron main
process to load that URL via `ELECTRON_DEV_URL`, skipping the standalone
build/copy/spawn pipeline. Edits to `app/`, `components/`, `lib/` hot-reload.
Restart the command if you change `electron/main.ts` or `electron/preload.ts`.

## Test

```bash
npm run test:run  # single run
npm test          # watch mode
```
