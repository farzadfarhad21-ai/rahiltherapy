# SEO Progress Tracker — rahiltherapy.com

> Live tracker of SEO fixes. Update after every batch.

**Last updated:** 2026-06-11
**Current SEO health score:** ~62/100 → targeting 85+

---

## ⚠️ MANUAL TODO (USER MUST PROVIDE)

### 🔴 LICENSE NUMBER — placeholder live everywhere

The string `TODO_LICENSE_NUMBER` is currently in:
- `about.html` — visible credentials box (large, prominent)
- `about.html` — Person JSON-LD schema (`identifier` + `hasCredential.identifier`)
- Footer of every page: `index.html`, `about.html`, `services.html`, `booking.html`, `blog.html`, `faq.html`, `contact.html`, `dubai.html`, `blog-post.html`

**When you get home:** run this command to replace all at once:
```bash
cd /Users/farzaden/Downloads/ruflow-project/raheleh_project
grep -rl TODO_LICENSE_NUMBER --include="*.html" | xargs sed -i '' 's|TODO_LICENSE_NUMBER|YOUR_REAL_NUMBER_HERE|g'
git add -A && git commit -m "feat: add real license number" && git push
```

Verify nothing left: `grep -rc TODO_LICENSE_NUMBER --include="*.html"`

---

## ✅ DONE (live on rahiltherapy.com)

### Batch 1 — Critical (June 11)
- [x] Removed wrong canonical pointing to `raheleavini.ir` in `articles/depth-schema-case-study.html`
- [x] Renamed `profile.PNG` → `profile.png` (lowercase) — fixes Facebook/LinkedIn previews
- [x] Updated all `profile.PNG` refs in HTML
- [x] Created `/llms.txt` — AI crawler discoverability (Persian site with English summary for AI)
- [x] Upgraded homepage schema: `MedicalBusiness` + `ProfessionalService` + Person credentials + MedicalTherapy services
- [x] Fixed blog.html thumbnail paths (../ → /) — image loading bug
- [x] Fixed daily-automation.js so future auto-posts won't reintroduce the bug
- [x] Added Dubai banner to `services.html` (matches homepage)
- [x] Synced `instagram-content.js` with daily blog topics (10 poetic topics) + better hashtags + emoji variety

### Batch 2 — High (June 11)
- [x] Created `/privacy.html` — full Persian privacy policy
- [x] Privacy link added to all footers
- [x] Copyright bumped 2025 → 2026 everywhere
- [x] BreadcrumbList JSON-LD on: `about, services, blog, faq, contact, dubai` (booking already had it)
- [x] Removed duplicate testimonials block in `index.html`
- [x] Replaced unsourced "40% faster" stat → clinical observation phrasing (YMYL fix)
- [x] Added `/privacy.html` to sitemap.xml

### Batch 6 — Time + sitemap polish (June 12)
- [x] Wrapped Jalali dates with `<time datetime="ISO">` on 49 articles (AI freshness signal)
- [x] Updated generator template so future posts emit `<time>` automatically
- [x] Added `<lastmod>` to all 35 sitemap URLs (article dates pulled from each article's Article schema)
- [x] Confirmed cat-*.png alt text is topic-descriptive (no rewrite needed)

### Batch 5 — Medium polish (June 12)
- [x] Expanded all 12 FAQ answers to 134-167 words each (both schema + visible HTML) for AI citation extraction
- [x] Added `hreflang="x-default"` to 9 main pages
- [x] Added `WebSite` + `SearchAction` schema to homepage (Google sitelinks searchbox eligibility)
- [x] Added "internal links" block (services + booking + about + dubai) to 50 articles, before final CTA
- [x] Updated daily-automation.js generator template to include internal-links block on future posts

### Batch 4 — Quality cleanup (June 12)
- [x] Noindex 24 duplicate/low-quality articles (5 parenting dups, 10 inner-child dups, 2 adhd dups, 1 depression dup, 1 relationships dup, 7 templated article-N.html)
- [x] Removed noindexed articles from sitemap.xml (35 URLs remain, was 41)
- [x] Added `Article` + `BreadcrumbList` JSON-LD to daily-automation.js generator (future posts auto-have it)
- [x] Updated article template footer in generator (2026 copyright + license placeholder + privacy link)
- [x] Backfilled `Article` + `BreadcrumbList` schema on 39 existing articles (50 now have Article schema)
- [x] Added meta description, og:tags, canonical to daily-automation.js article template
- [x] Expanded homepage about-teaser content (3 paragraphs → much richer YMYL signals)
- [x] Expanded /about story section (3 paragraphs → 5 paragraphs with credentials + specialty + diaspora context)

### Batch 3 — Medium (June 11)
- [x] License placeholder block on About page (large, visible, prominent)
- [x] License placeholder in footer (sitewide, all 9 main pages)
- [x] License placeholder in Person JSON-LD (`identifier` field)
- [x] Renamed `class="generated-post"` → `class="blog-article"` everywhere (51 files) — kills "AI content" signal
- [x] Expanded `robots.txt` — explicit Allow rules for GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, ChatGPT-User, Applebot, CCBot, Google-Extended, MistralAI, Meta, etc.
- [x] Added English summary block to `/about` — captures "Farsi-speaking therapist" English-language searches
- [x] Added English summary block to `/dubai` — bigger, more prominent (diaspora SEO)

---

## 🟡 STILL TO DO (prioritized)

### 🔴 Critical
- [ ] **Fill in real license number** (see top of file)

### 🟠 High
- [x] ~~Rewrite/noindex top 5 AI-batch articles~~ → noindexed 24 duplicates in batch 4
- [ ] Add `<time datetime="ISO">` tags around all Jalali dates in articles (AI freshness signal)
- [x] ~~Expand `/about` Persian content~~ → done in batch 4
- [x] ~~Expand `/index.html` hero/about Persian content~~ → done in batch 4
- [x] ~~Add explicit `Article` schema to all auto-generated articles~~ → done in batch 4 (generator + backfill)

### 🟡 Medium
- [x] ~~Expand FAQ answers~~ → done in batch 5 (all 12 to ~140 words each)
- [ ] Cite at least one source per article ("طبق راهنمای DSM-5", "بر اساس APA") — ongoing as new content is created
- [x] ~~Add `hreflang="x-default"` to homepage~~ → done in batch 5 (9 pages)
- [x] ~~Sitemap: add `<lastmod>` dates~~ → done in batch 6
- [x] ~~Internal linking: from article footers back to /services and /booking~~ → done in batch 5
- [x] ~~Improve image alt text for category icons~~ → confirmed topic-descriptive
- [ ] Audit auto-generated `meta description` for duplicates across articles
- [x] ~~Add `<time datetime="ISO">` tags around Jalali dates in articles~~ → done in batch 6

### 🟢 Low / Strategic
- [ ] YouTube channel — strongest brand-mention signal (0.737 correlation with AI citations)
- [ ] Add `Review` schema for testimonials section (needs real reviewer names + dates first)
- [x] ~~Add `WebSite` + `SearchAction` schema~~ → done in batch 5
- [ ] Add IPTC metadata (title/author/copyright) to auto-generated images

---

## 📊 Vercel deploys

All commits pushed to `main` auto-deploy to Vercel within ~1 min. To check:
- Live: https://rahiltherapy.com
- Vercel dashboard: https://vercel.com/farzadfarhad21-2748s-projects/rahiltherapy/deployments
- Validate schema: https://search.google.com/test/rich-results?url=https://rahiltherapy.com
- Validate llms.txt: visit https://rahiltherapy.com/llms.txt

---

## 🚀 Quick-fix reference (one-liners)

```bash
# Validate all JSON-LD schemas across pages
node -e "['index','about','services','booking','blog','faq','contact','dubai','privacy'].forEach(p=>{const h=require('fs').readFileSync(p+'.html','utf8');(h.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/g)||[]).forEach((m,i)=>{try{JSON.parse(m.replace(/<\/?script[^>]*>/g,''));}catch(e){console.log(p+'.html #'+i+': '+e.message);}});});console.log('all valid');"

# Count words in a page (approx)
curl -s https://rahiltherapy.com/about | tr ' ' '\n' | grep -v '^$' | wc -l

# Test if AI crawlers see llms.txt
curl -s https://rahiltherapy.com/llms.txt | head -20
```
