# KNOWN ISSUES & FIXES — rahiltherapy.com

> This file is a living memory. Every bug we hit gets documented here with the fix applied.
> Add new entries at the top (newest first).

---

## 2026-06-04

### [FIX] Persian-filename articles deleted from articles/ + sitemap
**Symptom:** 7 article files had Persian characters in filenames (e.g. `1780397844556-رشد-فردی.html`), which can cause 404s on Vercel routing.
**Fix:** Deleted the 7 Persian-filename files. Removed their `<url>` entries from sitemap.xml.
**Files changed:** articles/ (7 files deleted), sitemap.xml

### [FIX] Canonical tags added to about.html and blog.html
**Symptom:** About and blog pages missing canonical tags, causing potential duplicate content issues.
**Fix:** Added `<link rel="canonical">` to both pages:
- about.html → `https://rahiltherapy.com/about`
- blog.html → `https://rahiltherapy.com/blog`
**Files changed:** about.html, blog.html

### [FIX] Missing articles synced into blog.html grid
**Symptom:** blog.html showed only 21 of 36 articles. 15 articles were absent from the listing grid.
**Fix:** Added bcard entries for all 15 missing articles (timestamps + foundations + depth series) into blog.html grid, using correct category images per topic.
**Files changed:** blog.html

### [FIX] slugify() produced Persian filenames
**Symptom:** If `slugify()` was called for article filenames, it would output Persian characters (e.g., `اضطراب-و-کنترل-آن.html`), which can break Vercel routing and URL parsing in some browsers.
**Root cause:** Regex in `slugify()` kept Persian unicode chars instead of stripping them.
**Fix:** Rewrote `slugify()` to strip non-ASCII and added ASCII-only guard on all filename generation. Article filenames now always follow pattern `{timestamp}-{english-slug}.html` via `getEnglishName()`.
**Files changed:** `daily-automation.js`

### [FIX] Post-deploy article URL not verified
**Symptom:** Automation could deploy successfully but article URL could return 404 (e.g., wrong path, Vercel routing miss) with no alert.
**Fix:** Added `checkDeployedUrl()` function that fetches the article URL 30s after deploy and sends a Telegram alert to `@Rahiltherapy_bot` if status is not 200.
**Files changed:** `daily-automation.js`

---

## 2026-06-02

### [FIX] Image paths broke on Vercel
**Symptom:** Images returned 404 on live site.
**Root cause:** Images placed in `images/` subfolder — Vercel static serving requires all images in root.
**Fix:** All images moved to project root folder. All references updated to `./filename.png`.
**Rule:** Never put images in subfolders. Always root.

### [FIX] Article links in blog.html pointed to wrong path
**Symptom:** Clicking article cards on blog.html went to 404.
**Root cause:** Links used `/blog-post` instead of `/articles/[filename]`.
**Fix:** All blog card hrefs changed to `/articles/[filename]`.
**Rule:** Article links must always be `/articles/[timestamp]-[slug].html`.

### [FIX] CSS and images 404 inside articles
**Symptom:** Articles had no styles and broken images.
**Root cause:** Articles are one level deep (`/articles/`), so paths must go up one level.
**Fix:**
- Stylesheet: `../styles.css`
- Category images: `../cat-[topic].png`
- Author avatar: `../hero-portrait.jpg`
**Rule:** All asset paths inside `articles/*.html` must start with `../`.

### [FIX] MiniMax auth conflict on RuFlow launch
**Symptom:** RuFlow starts but immediately errors with auth conflict.
**Fix:** Run `/logout` in RuFlow, then re-confirm API key. Happens when session token expires.

### [FIX] Wrong Claude model string in blog-generator.js
**Symptom:** API call fails with model not found error.
**Root cause:** Used `claude-sonnet-4-20250514` instead of the correct string.
**Fix:** Model string must be exactly `claude-sonnet-4-5`.
**Rule:** Always use `claude-sonnet-4-5` for blog generation — never other version strings.

### [FIX] Mobile white space on right side
**Symptom:** Horizontal scroll bar appeared on mobile, content overflowed right edge.
**Fix:** Added `html { overflow-x: hidden; }` to styles.css.

### [FIX] Mobile hamburger menu missing / not RTL
**Symptom:** No hamburger menu on mobile; nav links invisible.
**Fix:** Built slide-in RTL drawer with backdrop and X button. Added to all 7 HTML pages.

### [FIX] Telegram links opened inside Telegram app instead of Safari
**Symptom:** Article links posted to Telegram channel opened in Telegram's in-app browser.
**Fix:** Changed link format to plain URL (no markdown link wrapping) so Telegram opens it in Safari.

### [FIX] MiniMax image generation not available on sk-cp plan
**Symptom:** Image generation API call returns 403 / plan restriction error.
**Root cause:** MiniMax `sk-cp-` API keys don't have image generation access.
**Fix:** Fall back to `cat-[topic].png` category images. Image generation code kept but wrapped in try/catch with graceful fallback.
**Status:** Unresolved — need a different API key plan or switch to Segmind for image gen.

### [FIX] Vercel deploy command variation
**Symptom:** `vercel deploy` without flags sometimes deploys to preview instead of production.
**Fix:** Always use: `npx vercel deploy --yes --prod --force`

---

## How to Use This File

- Before starting a new session, skim the entries above for context
- When you hit a new bug, add it here immediately after fixing
- Format: `### [FIX] Short description` → Symptom → Root cause → Fix → Files changed
