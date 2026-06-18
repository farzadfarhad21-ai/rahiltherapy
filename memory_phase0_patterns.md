# Project Memory — rahiltherapy.com

## Patterns

- Article path: `/articles/{timestamp}-{english-slug}.html` (ASCII slug only)
- Asset paths inside `articles/*.html`: `../` prefix required (CSS, images)
- Images: always at repo root, never in subfolders
- Deploy: `npx vercel deploy --yes --prod --force`
- Blog model: `claude-sonnet-4-5` (exact string)
- Telegram links: plain URL format, no markdown wrapping
- Vercel auto-strips .html → 308 redirect. URL-check code must follow redirects.
- GENERATION_PROVIDER env: `ruflo` (default/MiniMax) | `anthropic` (direct)
- MiniMax endpoint: `https://api.minimax.io/anthropic`

## Current Issues (2026-06-18)

### Fixed today
- [DONE] Duplicate meta+canonical in about.html (lines 112-119 removed, canonical → clean URL)
- [DONE] Duplicate meta+canonical in contact.html (lines 105-117 removed)
- [DONE] Duplicate pricing section in services.html (lines 519-553 removed)
- [DONE] daily-automation.js redirect bug: now uses `{redirect:'follow'}` in fetch
- [DONE] GENERATION_PROVIDER flag added to blog-generator.js and daily-automation.js

### Still open
- LICENSE NUMBER: placeholder `۲۸۴۶۰` in dubai.html footer — user must replace with real number
- Vercel cron chain (8am UTC → /api/trigger-daily → GitHub Actions → daily-automation): June 18 missed. Check GH_DISPATCH_TOKEN still valid in Vercel env vars.

## State Snapshot (2026-06-18)
- Commits: b3a6118 (feat: GENERATION_PROVIDER), 280bb18 (fix: duplicate meta)
- Live: https://rahiltherapy.com
- Canonical counts fixed: about.html=1, contact.html=1
- Article URLs: resolve to 200 after redirect
- 49 articles with JSON-LD schema
