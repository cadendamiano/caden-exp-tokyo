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

## Run

```bash
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm start         # production server
```

## Test

```bash
npm run test:run  # single run
npm test          # watch mode
```
