# rahiltherapy.com — Full briefing for any AI (ChatGPT/Codex, Claude, others)

Read this whole file before doing anything. It explains what exists, what we
learned the hard way, and the rules for working here. Written 2026-09-15.

---

## 1. What this project is

- **Live site:** https://rahiltherapy.com — Persian (Farsi, RTL) website for
  **Raheleh Avinipour (راحله اوینی‌پور)**, a general psychologist based in Dubai who
  works online with Persian speakers worldwide (CBT, Schema Therapy).
- **Goal of the site:** rank on Google (and get cited by AI search) for Persian
  psychology searches → visitors book a free first session via WhatsApp.
- **Stack:** plain static HTML + one shared `styles.css`. No framework, no build step.
  Hosted on **Vercel**. Code on GitHub `farzadfarhad21-ai/rahiltherapy` (branch `main`).
- **Size:** 12 core pages + ~80 articles in `articles/`.

## 2. File map

| Path | What it is |
|---|---|
| `index.html` `about.html` `services.html` `booking.html` `blog.html` `faq.html` `contact.html` `dubai.html` `parents.html` `privacy.html` | Core pages |
| `styles.css` | Shared design system (cream/rose palette, Markazi Text + Vazirmatn fonts) |
| `articles/*.html` | Articles. Auto ones: `{timestamp}-{english-slug}.html`. Hand-written: `foundations-*`, `depth-*`, `authority-*` |
| `daily-automation.js` | **The only live content engine** (~1100 lines) |
| `api/trigger-daily.js` | Vercel cron endpoint → dispatches the GitHub Action |
| `.github/workflows/daily-blog.yml` | Runs `daily-automation.js`, commits, pushes |
| `notify-telegram.js` | Telegram post after deploy |
| `blog-generator.js`, `api/generate-blog.js` | **LEGACY, unused** — do not edit or copy their patterns |
| `vercel.json` | cleanUrls, rewrites, security + cache headers, 308 redirects for merged duplicates |
| `sitemap.xml` `robots.txt` `llms.txt` | Crawl + AI-citation layer |
| `instagram-pipeline/` | Python: Reels with Raheleh's cloned voice (ElevenLabs) + Persian captions |
| `agents/` | Old prompt files for a role-based agent team (CEO/SEO/content/social) |

**Documents — read in this order:**
1. `SEO_TODO.md` — top status + the latest dated sessions (results, what's next)
2. `KNOWN_ISSUES.md` — every bug, root cause and fix (newest first)
3. `BACKLINK_PLAN.md` — paste-ready directory submission packet (NAP, bios)
4. `SEO-CONTENT-PLAN.md` — original 12-week content plan
5. `WORKFLOW_PERSONAL_BUSINESS_WEBSITE.md` — the original zero-to-live build recipe
6. `RAHELEH_PROJECT_CONTEXT.md` — early setup log (partly outdated: MiniMax, old paths)

## 3. How the daily automation works

```
08:00 UTC  Vercel cron → /api/trigger-daily (CRON_SECRET)
        → GitHub workflow_dispatch (GH_DISPATCH_TOKEN) → daily-blog.yml
        → node daily-automation.js
            1. pick today's topic from TOPICS (19-topic rotation)
            2. findTopicArticle(): topic already has a page?
                 yes → refreshBlogPost(): deepen it in place, bump dateModified
                 no  → generateBlogPost(): new article (Anthropic API)
            3. generateImage() via Segmind
            4. update blog.html card + sitemap.xml <lastmod>
            5. deploy to Vercel, then checkDeployedUrl() (alerts Telegram on 404)
        → git commit "Automated daily blog post" + push
        → notify-telegram.js posts to channel @raheleh21
```
Secrets live in GitHub/Vercel (never in the repo): `ANTHROPIC_API_KEY`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `VERCEL_TOKEN`, `SEGMIND_API_KEY`,
`GH_DISPATCH_TOKEN`, `CRON_SECRET`.

## 4. The SEO system we built (reuse all of this)

**Technical (verified live, done):**
- Clean URLs everywhere (`/about`, `/articles/slug`) — `cleanUrls: true`. Every
  canonical, `og:url`, JSON-LD `mainEntityOfPage`, sitemap `<loc>` and internal link
  uses the clean URL. A single `.html` leftover split Google's signal across two URLs.
- One self-referencing `<link rel="canonical">` per page. Never two.
- `<html lang="fa" dir="rtl">`, `hreflang="fa"`, `og:locale fa_IR`.
- Every page: unique `<title>`, non-empty meta description, Open Graph + Twitter card.
- JSON-LD: homepage `Person` + `EducationalOccupationalCredential` + `MedicalTherapy`
  + `OfferCatalog/Offer/Service`; articles `Article` + author `Person`; booking
  `Service` with prices; plus `BreadcrumbList`, `FAQPage`.
- `sitemap.xml` with `<lastmod>`, clean URLs only, no redirects/404s in it.
- `robots.txt` explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot,
  PerplexityBot, Google-Extended. `llms.txt` summarises the practice for LLMs.
- Performance: hero image preloaded, Google Fonts loaded non-blocking, Google
  Analytics (G-8TSXZKEW9N) lazy-loaded after `window.load`, long cache headers.
- Security headers in `vercel.json`.
- UTM tags ONLY on social share links (Telegram/Instagram) — never on canonical,
  og:url, JSON-LD, sitemap.
- Google Search Console connected (OAuth, app set "In production").

**Content:**
- Topic clusters: a hub article + 3 supporting articles that all interlink
  (OCD cluster around `depth-erp-ocd`). Every article has a "مقالات مرتبط" block.
- E-E-A-T: author box, credentials, licence number (**currently none** — `۲۸۴۶۳` was wrong and was removed 2026-10-06; never restore it, wait for the real one),
  sources/citations block required on every refresh.
- Refresh-instead-of-duplicate: one URL per topic, deepened over time.

**Off-site:** NAP (name/phone/website) fixed and identical everywhere —
see `BACKLINK_PLAN.md`. Canonical phone `+989124228995`.

## 5. What the data taught us (measured in Google Search Console)

- ✅ **Long-tail, specific topics win** (`depth-erp-ocd` = position ~5, most of the traffic).
  Head terms ("طرحواره درمانی چیست") are owned by big Iranian clinic sites.
- ✅ **Hand-written expert articles are ~65× more productive** than auto-generated ones.
- ✅ Fixing empty descriptions + wrong dates → clicks up 2.5× in two weeks.
- ✅ Niche angle competitors lack: **diaspora / Dubai Persian speakers**.
- ❌ **Mass AI posts created duplicates** (33 near-identical pages) and thin YMYL content.
- ❌ **The real bottleneck: zero backlinks / zero off-site presence.** Nothing was
  ever submitted to directories. Great on-page SEO alone gave ~10 clicks/month.

## 6. Hard rules — mistakes we already paid for (do not repeat)

1. **Never let the AI model write a date, URL, slug or any field that must match
   another field.** Compute it in code and substitute (the model stamped every post
   "May 2025").
2. **Validate generated output and fail loudly.** An empty meta description shipped
   on 51 articles because a regex silently returned `''`.
3. **Filenames and slugs ASCII-only.** Persian filenames broke Vercel routing.
4. **Check for an existing page before creating one** (rotation made duplicates).
5. **URL checks must follow redirects** (Vercel 308s `.html` → clean URL).
6. **Assets in `articles/` use `../`** (`../styles.css`, `../cat-x.jpg`).
7. Private docs (`*.md`) sit in the deploy root and ARE publicly served — never put
   secrets, tokens or private client data in them.

## 7. Rules for working in THIS repo (several AIs share it)

- **One AI at a time.** Start with `git pull` and `git status`. Uncommitted changes you
  didn't make → stop and ask the human.
- **Don't push between 07:45 and 08:30 UTC** — the daily Action is committing then.
- Commit small, clear messages; add a dated entry to `KNOWN_ISSUES.md` for any bug
  fixed and to `SEO_TODO.md` for any SEO session.
- Never commit `.env`, tokens, `raheleh_voice/`, or `instagram-pipeline/.env`.
- Don't edit the legacy generators; don't add a licence number unless the human gives the real one; don't rewrite the
  hand-written `depth-*` / `foundations-*` articles without the human's OK.

---

## 8. Building a NEW website in another category — do it better

Use this project as the proven playbook, but fix what we'd do differently:

1. **Research first:** real keyword demand + who ranks. Pick a niche angle big sites
   don't cover (like our diaspora angle). Plan clusters (hub + supporting) up front.
2. **Use a small static generator** (e.g. Eleventy/Astro) with shared layouts instead of
   copying `<head>` into 90 HTML files — our site-wide fixes had to touch every file.
   Build canonical/OG/JSON-LD/sitemap from ONE template so they can never disagree.
3. **Content engine with guards from day 1:** one URL per topic, refresh not duplicate,
   code-computed dates/URLs, required citations, length guard, output validation.
   Keep a human/expert review step for health, finance or legal (YMYL) topics.
4. **Off-site presence from week 1**, not month 3: Google Business Profile, Bing Places,
   niche directories, consistent NAP. This is what we never did.
5. **Measure from day 1:** Search Console + Analytics, record a baseline, re-check every
   2–4 weeks, and let the data pick the next cluster.
6. **Keep private docs out of the deploy** (a `docs/` folder + `.vercelignore`).
7. Same crawl/AI layer: `robots.txt` AI bots, `llms.txt`, clean URLs, performance rules.
