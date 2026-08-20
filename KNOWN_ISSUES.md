# KNOWN ISSUES & FIXES — rahiltherapy.com

> This file is a living memory. Every bug we hit gets documented here with the fix applied.
> Add new entries at the top (newest first).

---

## 2026-08-20

### [FIX] Topic rotation republished every topic every 23 days — 33 duplicate articles
**Symptom:** 109 articles covering only 76 topics. Nine topics had three copies each. Every duplicate was in the sitemap and submitted to Google.
**Root cause:** `getTodayTopic()` picks with `Math.floor(Date.now()/86400000) % TOPICS.length`. With 23 topics the cycle repeats every 23 days and each pass published a NEW article. Two full cycles had completed; the third had started. The `dedupeBlock` prompt varied the *title* but still produced a rival page for the same query.
**Fix:** Added `findTopicArticle()` + `refreshBlogPost()`. When a topic already has a live indexable article the run now deepens that article in place, bumps `dateModified`, updates the sitemap `<lastmod>` instead of adding a row, and updates the existing blog.html card instead of adding a second one. A refresh that comes back >10% shorter than the original is rejected.
**Also:** consolidated the existing 33 — kept the longest article per topic, 308-redirected the rest via `vercel.json`, removed from sitemap + blog.html.
**Files changed:** `daily-automation.js`, `vercel.json`, `sitemap.xml`, `blog.html`, 33 articles deleted
**Commit:** `9dfd51b`

### [FIX] extractExcerpt() silently returned '' — 51 articles shipped an empty meta description
**Symptom:** `<meta name="description" content="">` plus empty `og:description`, `twitter:description` and Article-schema `"description"` on 47% of the blog. Google wrote its own snippets; shared links had no preview text.
**Root cause:** `/<p[^>]*>(.{50,150})<\/p>/` requires a paragraph whose ENTIRE content is 50–150 characters. The model writes 400–600. Nothing ever matched, so the function returned `''` and nothing checked it. Broken since early June.
**Fix:** The prompt now emits an explicit `<!--DESCRIPTION:...-->` line. `extractExcerpt(rawContent, articleHtml)` prefers it, falls back to the opening paragraph truncated at a word boundary, and generation **throws** if both fail — an empty description can no longer ship silently. Backfilled 26 surviving articles.
**Files changed:** `daily-automation.js`, 26 articles
**Commit:** `9dfd51b`

### [FIX] Every auto-published article was stamped 15 May 2025
**Symptom:** Visible date said `۱۵ مه ۲۰۲۵` while the schema said today. 64 of 96 articles had a visible/schema date mismatch. Persian rendering flipped between Gregorian and Jalali at random.
**Root cause:** The prompt template contained `<time datetime="[تاریخ ISO YYYY-MM-DD]">[تاریخ فارسی]</time>` — the model filled it in, and it hallucinated its own idea of "today" every run. The schema date was computed correctly in JS, so the two never agreed.
**Fix:** Removed the date from the prompt entirely (model now writes the literal `__META__`). `renderDateTag()` / `buildMetaLine()` / `normalizeMetaLine()` build the meta line in code from the timestamp, and `normalizeMetaLine()` overwrites whatever the model produced. On a refresh it also renders `بروزرسانی: <date>`. Corrected 72 existing articles from their schema `datePublished`.
**Files changed:** `daily-automation.js`, 72 articles
**Commit:** `9dfd51b`
**Rule:** Never let the model author a date, a URL, or any field that must agree with another field. Compute it and substitute.

### [RESOLVED] Licence number ۲۸۴۶۳ — CONFIRMED REAL, do not remove again
**History:** commit `301f495` (12 Jun) replaced the literal `TODO_LICENSE_NUMBER` with `۲۸۴۶۳` and described it in its own message as a placeholder that was "clearly fake". On that basis it was stripped from all 83 footers, the About box and the Person schema in `9dfd51b` (20 Aug).
**Correction:** Farzad confirmed on 2026-08-20 that **۲۸۴۶۳ is Raheleh's genuine سازمان نظام روانشناسی registration number.** The June commit message was wrong about it, or the real number was substituted without the note being updated.
**Fix:** restored to all 83 footers, the About credentials box (with the «قابل استعلام» line), the Person JSON-LD `identifier`, `hasCredential.identifier`, and the `daily-automation.js` article template so new posts inherit it.
**Files changed:** 83 files, `about.html`, `daily-automation.js`
**Commit:** `9dfd51b` (removal), see below (restoration)
**⚠️ RULE:** this number is verified. Do **not** treat it as a placeholder again, whatever the June commit message or old SEO_TODO entries say.

### [FIX] og:url and mainEntityOfPage still carried .html — missed by the July canonical fix
**Symptom:** The 2026-07-09 fix corrected `<link rel="canonical">` on all articles but left 25 `og:url` and 43 `"mainEntityOfPage"` values pointing at `.html` paths, plus 128 internal links in blog.html/index.html/parents.html/llms.txt.
**Root cause:** The July pass targeted canonical tags specifically rather than every URL-bearing field.
**Fix:** Site-wide `/articles/{slug}.html` → `/articles/{slug}`. 270 URLs across 54 article files plus the 128 internal links. Zero `.html` article URLs remain anywhere.
**Files changed:** 54 articles, `blog.html`, `index.html`, `parents.html`, `llms.txt`
**Commit:** `9dfd51b`

### [RESOLVED] Search Console OAuth token expired — app now published, no more 7-day clock
**Symptom:** `gsc_query.py` fails with `RefreshError: invalid_grant: Bad Request`.
**Cause:** The refresh token is no longer valid (OAuth clients in "Testing" publishing status expire refresh tokens after 7 days; last successful use was 2026-07-15).
**Fix:** Needs an interactive browser re-auth — run `~/.config/claude-seo/gsc_auth.py` and complete the Google consent screen. Claude cannot do this. To stop it recurring, set the OAuth consent screen to "In production" in Google Cloud Console.
**Resolved 2026-08-20.** Re-authorised, and the OAuth app was moved from "Testing" to "In production" so refresh tokens stop expiring after 7 days.

**Where the publish control lives now:** Google renamed this area to **Google Auth Platform**. The publish button is on the **Audience** page, not the old "OAuth consent screen" page. It stays greyed out until the **Branding** page has the App domain fields filled in — for this project: home page `https://rahiltherapy.com`, privacy policy `https://rahiltherapy.com/privacy`, authorised domain `rahiltherapy.com` (accepted because the domain is already verified in Search Console under the same account). Do NOT upload an app logo — that triggers a verification requirement. Do NOT use "Make internal" — it needs a Workspace org and this is a personal gmail account.

**Three traps when re-running the auth flow:**
1. `gsc_auth.py` run through a non-TTY pipe buffers its stdout, so the "Please visit this URL" line never appears and no browser opens — it just hangs. Run it with `python -u` and `open_browser=False`, then read the URL from the output.
2. Killing a hung flow with `pkill -f gsc_auth.py` does not match a `python -c` inline variant. Free the port by PID instead: `lsof -nP -iTCP:<port> -sTCP:LISTEN -t | xargs kill -9`. A stale listener makes the next attempt die with "address already in use".
3. `accounts.google.com` returns a **500** for a few minutes right after the publishing status changes. It is not a config error — wait and retry.

**After publishing,** the consent screen shows "Google hasn't verified this app" → Advanced → "Go to claude SEO (unsafe)". Expected, and harmless: verification only matters for apps with many external users; this one has a single user.

**A superseded token backup is at** `~/.config/claude-seo/token.json.bak-20260820` — it is a live credential and can be deleted once you are happy the new one is working.

---

## 2026-07-09

### [FIX] Split-URL indexing bug — canonical/sitemap mismatch was starving Google ranking signal
**Symptom:** GSC showed the site indexed (75 pages) but nearly zero search visibility (70 impressions, 2 clicks over 3 months) with almost no query diversity. `Pages.csv` export showed Google tracking the *same* article as two separate URLs (e.g. `depth-erp-ocd` and `depth-erp-ocd.html` both listed with separate impression counts).
**Root cause:** `vercel.json` has `cleanUrls: true`, which 308-redirects any `.html` path to its clean equivalent. But `sitemap.xml` and 31 of 62 article canonical tags still pointed at the `.html` path, and 12 articles had no canonical tag at all. This split Google's ranking signal across two URLs per page instead of consolidating it on one.
**Fix:**
- Added/corrected canonical tags on all 62 articles → point to the clean URL
- Fixed `services.html` self-referencing canonical (was `/services.html`, now `/services`)
- Rewrote `sitemap.xml` to list clean URLs everywhere (71 URLs, all verified 200 direct, zero redirects)
- Fixed every internal nav link site-wide (`about.html`→`/about` etc.) across all core pages
- Removed dead `google-site-verification.html` (had a literal `PLACEHOLDER_VERIFY_CODE`, unused — real verification is `googlee26f25a40d40c461.html`)
- Added "روانشناس آنلاین فارسی‌زبان" to homepage/services hero copy — GSC query data showed zero impressions for this core commercial phrase despite it being the main service offered
**Files changed:** `sitemap.xml`, `services.html`, `index.html`, all 62 `articles/*.html`, nav links across `about/services/booking/blog/faq/contact/dubai/privacy/parents/blog-post.html`
**Commits:** `371a248`, `ba6486d`

### [FIX] daily-automation.js was reintroducing the same .html canonical bug on every new article
**Symptom:** The 6 articles auto-published by the daily cron *while the above fix was in progress* had the same `.html` canonical bug — confirming the generator template was the root source, not just historical drift.
**Fix:** Added `toSlug()` helper in `daily-automation.js`; applied it everywhere a public URL is built (canonical, og:url, JSON-LD `mainEntityOfPage`/breadcrumb, sitemap `<loc>` entry, blog.html card links, Telegram share URL, post-deploy `checkDeployedUrl` target, site nav in the article template). Filesystem paths (`fs.readFileSync`/`writeFileSync`) correctly keep the real `.html` filename — only public URLs were changed.
**Files changed:** `daily-automation.js`
**Commit:** `db38e3a`
**Note:** `blog-generator.js` and `api/generate-blog.js` have the identical bug pattern but are NOT used by the live cron (`.github/workflows/daily-blog.yml` runs `daily-automation.js` only) — left untouched, legacy/unused.

### [SETUP] Google Search Console API access connected
**What:** OAuth Desktop-app flow set up so Claude can query GSC directly instead of the user exporting CSVs manually. Service account key creation was blocked by an org policy (`iam.disableServiceAccountKeyCreation`) that couldn't be overridden at the project level, so used OAuth instead.
**Credentials location:** `~/.config/claude-seo/` — `oauth_client_secret.json` (OAuth client), `token.json` (refresh token, auto-renews), `venv/` (Python env with `google-auth-oauthlib` + `google-api-python-client`)
**Query script:** `~/.config/claude-seo/gsc_query.py` — commands: `sites`, `sitemaps`, `performance [days]`, `pages [days]`. Targets `sc-domain:rahiltherapy.com`.
**Also has access to:** `sc-domain:khodrodubai.com` (different project, same Google account)

### [PATTERN] UTM tagging for social shares
- Telegram URLs: `?utm_source=telegram&utm_medium=social&utm_campaign=daily-blog`
- Instagram URLs: `?utm_source=instagram&utm_medium=social&utm_campaign=daily-blog`
- Helper: `withUtm(url, source, medium, campaign)` in daily-automation.js
- NEVER add UTMs to: canonical, og:url, JSON-LD, sitemap, checkDeployedUrl target
- Telegram caption uses plain URL (not markdown-wrapped) so iOS opens Safari

## 2026-06-18

### [FIX] Duplicate meta+canonical blocks in about.html and contact.html
**Symptom:** about.html had 2 canonical tags (lines 34+119 with different values) and 2 meta descriptions. contact.html had 2 canonical tags and 2 meta descriptions.
**Fix:** Deleted the duplicate blocks (about lines 112-119, contact lines 105-117). Updated about.html canonical to clean URL (no .html).
**Files changed:** about.html, contact.html

### [FIX] Duplicate pricing section in services.html
**Symptom:** services.html had two pricing sections — structured 3-card version AND simpler 2-card inline version.
**Fix:** Deleted the duplicate (lines 519-553). Kept the structured 3-card CSS-based version.
**Files changed:** services.html

### [FIX] daily-automation.js redirect-follow bug
**Symptom:** checkDeployedUrl() used `fetch(url,{method:'HEAD'})` without `{redirect:'follow'}`. Caused false-404 on every deploy (Jun 14-17). Vercel 308-redirects .html→clean URL but HEAD doesn't follow.
**Fix:** Changed to `fetch(url,{method:'GET',redirect:'follow'})`.
**Files changed:** daily-automation.js

### [FIX] Added GENERATION_PROVIDER env flag
**Symptom:** No way to switch between RuFlo/MiniMax and direct Anthropic.
**Fix:** GENERATION_PROVIDER='ruflo' (default/MiniMax) | 'anthropic' (direct). Each generation logged to logs/generations.log.
**Files changed:** blog-generator.js, daily-automation.js

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
