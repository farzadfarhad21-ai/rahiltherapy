# راحله اوینی‌پور — Project Context for Claude Code
> Give this file to Claude Code at the start of any session to get full context instantly.

## Project Identity
- **Live URL:** https://rahiltherapy.com
- **Vercel Project:** raheleh_project
- **Local folder:** ~/Downloads/ruflow-project/raheleh_project/
- **Type:** Persian RTL psychology website, fully static HTML/CSS
- **Owner:** Raheleh Evinipour, **روانشناس عمومی** (general psychologist), Dubai-based, serves Persian speakers worldwide

## Tech Stack
- **Frontend:** Pure HTML + CSS (no framework), RTL Persian, Markazi Text + Vazirmatn fonts
- **Hosting:** Vercel (static deployment)
- **Domain:** rahiltherapy.com (registered on Namecheap, using Vercel DNS)
- **DNS:** ns1.vercel-dns.com / ns2.vercel-dns.com
- **Blog automation:** Node.js script using Anthropic API (claude-sonnet-4-5)
- **AI model in RuFlow:** MiniMax M2.7 via ~/.claude/settings.json

## File Structure
```
raheleh_project/
├── index.html          — Homepage
├── about.html          — About page
├── services.html       — 8 services with unique images
├── booking.html        — Booking form → WhatsApp
├── blog.html           — Blog listing with pagination
├── faq.html            — FAQ accordion
├── contact.html        — Contact with icons
├── blog-post.html      — Static blog post template (legacy)
├── styles.css          — Shared styles (all pages use this)
├── blog-generator.js   — Blog automation script
├── api/generate-blog.js — Vercel cron endpoint
├── vercel.json         — Clean URLs + cron config (8am UTC daily)
├── sitemap.xml         — For Google (rahiltherapy.com)
├── robots.txt          — SEO crawl rules
├── googlee26f25a40d40c461.html — Google Search Console verification
├── setup-cron.sh       — Local cron setup script
├── README-blog.md      — Blog automation docs
├── articles/           — Generated article HTML files
│   ├── 1704068400000-anxiety-control.html
│   ├── 1780322853405-article-5.html
│   ├── 1780334489654-article-3.html
│   ├── 1780334637329-article-7.html
│   ├── 1780334685120-article-8.html
│   ├── 1780334731489-article-9.html
│   └── 1780334796519-article-2.html
└── [image files in root]:
    hero-portrait.jpg       — Homepage hero (white blouse, AI generated)
    about-hero.jpg          — About page (Dubai skyline, AI generated)
    blog-feature.jpeg       — Legacy blog image
    therapy-session.jpg     — Legacy service image
    service-anxiety.png     — Service page image
    service-depression.png
    service-family.png
    service-ocd.png
    service-online.png
    service-schema.png
    service-selfesteem.png
    service-adhd.png
    cat-anxiety.png         — Blog category images (10 total)
    cat-depression.png
    cat-relationships.png
    cat-growth.png
    cat-schema.png
    cat-ocd.png
    cat-parenting.png
    cat-adhd.png
    cat-selfawareness.png
    cat-mindfulness.png
```

## Key Credentials & IDs
- **WhatsApp:** +989124228995
- **Telegram:** @raheleh21
- **Email:** ravinipour@gmail.com
- **Google Analytics:** G-8TSXZKEW9N
- **MiniMax model:** MiniMax-M2.7
- **MiniMax base URL:** https://api.minimax.io/anthropic
- **Blog model:** claude-sonnet-4-5
- **Vercel env var:** ANTHROPIC_API_KEY (set in Vercel dashboard)

## MiniMax Settings (~/.claude/settings.json)
```json
{
  "enabledPlugins": {"vercel@claude-plugins-official": true},
  "theme": "auto",
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_API_KEY": "sk-cp-..."
  },
  "model": "MiniMax-M2.7"
}
```

## Design System (styles.css variables)
```css
--cream: #FBF5F0
--cream2: #F4E9E2
--rose: #9C6A60
--rose-2: #8A574F
--rose-soft: #C99488
--ink: #3B2E2A
--muted: #806B63
--green: #5BA37A
```
Fonts: Markazi Text (headings) + Vazirmatn (body), both from Google Fonts

## Blog Automation
- **Script:** node blog-generator.js [topic]
- **Cron:** Vercel cron runs api/generate-blog.js daily at 8am UTC
- **Topics rotate:** اضطراب، افسردگی، روابط، عزت نفس، طرحواره درمانی، OCD، رشد فردی، والدین، ADHD، ذهن‌آگاهی
- **Category images:** cat-[category].png in root folder
- **Article path:** articles/[timestamp]-article-[N].html
- **Article links in blog.html:** /articles/[filename]
- **Author avatar in articles:** ../hero-portrait.jpg

## Booking Form
- Form in booking.html submits to WhatsApp via window.open()
- Format: https://wa.me/989124228995?text=ENCODED_MESSAGE
- Includes: name, email, whatsapp, country, concern, session format, days, notes
- Success message shown after submit in Persian

## Known Issues / Watch Out For
1. **Image paths:** All images must be in ROOT folder, not images/ subfolder — Vercel serves from root
2. **Article links:** blog.html cards must link to /articles/[filename], not /blog-post or /blog.html
3. **CSS path in articles:** Articles use ../styles.css (one level up)
4. **Category images in articles:** Use ../cat-[category].png (one level up)
5. **Author avatar:** ../hero-portrait.jpg in article template
6. **MiniMax conflict:** If auth conflict on launch, run /logout then confirm API key
7. **Blog generator model:** Must be claude-sonnet-4-5 (not claude-sonnet-4-20250514)
8. **Deployment:** Always use: npx vercel deploy --yes --prod --force

## Deploy Command
```bash
cd ~/Downloads/ruflow-project/raheleh_project
npx vercel deploy --yes --prod --force
```

## Run Blog Generator
```bash
export ANTHROPIC_API_KEY=your_key
node blog-generator.js                    # random topic
node blog-generator.js "موضوع خاص"        # specific topic
```

## Pages & Their Purpose
| Page | Persian | Key Feature |
|------|---------|-------------|
| index.html | صفحه اصلی | Hero, services preview, about teaser, blog preview, testimonials, booking CTA |
| about.html | درباره من | Full bio, credentials, specialties |
| services.html | خدمات | 8 services with unique images and detailed descriptions |
| booking.html | رزرو جلسه | Form → WhatsApp, day selector, session format |
| blog.html | مقالات | Category filter, featured article, card grid, pagination |
| faq.html | سوالات متداول | Accordion FAQ |
| contact.html | تماس | WhatsApp/Email/Telegram cards with icons, contact form |
| articles/*.html | مقالات | Generated articles with sidebar CTA, author box |

## Google & SEO
- Search Console: verified, sitemap submitted
- Analytics: G-8TSXZKEW9N on all pages
- Target keywords: روانشناس آنلاین فارسی، مشاوره روانشناختی، طرحواره درمانی فارسی، CBT فارسی
- Daily blog posts build organic Persian search traffic

## Pricing
- International: $50/session
- From Iran: $25/session (war/sanctions consideration)
- First session: FREE

---

## ✅ SESSION LOG — 2026-06-02 (Major Setup)

### What Was Built
1. **Agent Team** (`agents/` folder):
   - `ceo.md` — Orchestrator, runs full campaign
   - `seo-agent.md` — Google rankings using claude-seo + seo-audit skills
   - `content-agent.md` — Persian blog posts and copy
   - `social-agent.md` — Instagram, Telegram, YouTube content calendar
   - `bug-agent.md` — Website errors and performance
   - `report-agent.md` — Weekly summary report in Persian

2. **Skills Installed** (global, `~/.agents/skills/`):
   - `find-skills` — search marketplace
   - `seo-audit` — SEO analysis
   - `social-content` — social media posts
   - `content-strategy` — content planning
   - `audit-website` — bug checking
   - `copywriting` — conversion copy
   - `claude-seo` — full 18-agent SEO suite (`~/.claude/skills/seo/`)

3. **SEO Campaign Run**:
   - 12-week content plan → `SEO-CONTENT-PLAN.md`
   - Week 1: anxiety cornerstone article → `articles/foundations-anxiety-guide.html`
   - Week 2: depression cornerstone article → `articles/foundations-depression-guide.html`
   - Schema markup added to all 7 pages
   - Sitemap updated, Open Graph tags added
   - Backlink strategy → `SEO-BACKLINK-STRATEGY.md`

4. **Mobile Fixes Deployed**:
   - Hamburger menu: slide-in RTL drawer with backdrop + X button
   - White space fix: `html{overflow-x:hidden}`
   - Mobile sticky bar: full width RTL enforced
   - All 7 pages + styles.css updated

5. **Telegram Bot Setup**:
   - Bot: `@Rahiltherapy_bot`
   - Token: stored in `.env` as `TELEGRAM_BOT_TOKEN`
   - Channel: `@raheleh21` (ارامش و معنا)
   - Channel ID: `-1002037624159` stored in `.env` as `TELEGRAM_CHANNEL_ID`

6. **Daily Automation** (`daily-automation.js`):
   - Runs daily at 8am via cron
   - Picks topic by rotation (10 Persian mental health topics)
   - Generates 1800-word Persian article via MiniMax API
   - Updates blog.html + sitemap.xml
   - Posts to Telegram channel with title + summary + link
   - Deploys to Vercel automatically
   - Logs to `logs/automation.log`
   - **IN PROGRESS**: Adding MiniMax image generation per topic

### SESSION 1 COMPLETED ✅ — 2026-06-02

### SESSION 2 COMPLETED ✅ — 2026-06-02 (continued)

**Completed:**
- ✅ All 12 SEO articles live (weeks 3-12)
- ✅ blog.html refreshed showing all 12 articles
- ✅ Instagram @rahiltherapy created (Professional account)
- ✅ First Instagram post live
- ✅ 7-day Instagram caption schedule → instagram-schedule.md
- ✅ instagram-content.js — regenerates weekly schedule
- ✅ CEO agent updated — Instagram agent now in full campaign flow
- ✅ Learning memory system built:
  - agents/memory.md — tracks what works monthly
  - agents/learning-rules.md — 5 rules all agents follow
  - agents/weekly-report-template.md — Sunday report template
  - report-agent.md updated to append to memory.md
- ✅ Graphify run on agents/ — graph saved to agents/graphify-out/
- ✅ Telegram links now open in Safari (plain URL format)
- ✅ profile.PNG set as profile photo on site + Instagram

### SESSION 3 COMPLETED ✅ — 2026-06-02 (evening)

**Completed:**
- ✅ Facebook Page created: راحله اوینی پور روانشناس (Full control)
- ✅ Facebook + Instagram linked in Accounts Center
- ✅ Meta Developer App setup started at developers.facebook.com
- ✅ Caption emojis fix queued for instagram-content.js
- ✅ Researched best cheap Instagram automation stack

**Planned Instagram Automation Stack ($3-5/month total):**
- Segmind API — AI image generation ($0.01-0.03/image)
- Meta Graph API — free auto-posting to Instagram
- Gamma — free beautiful carousel slide generation
- n8n — free self-hosted workflow connector

### Next Steps (carry forward to next session)
- [ ] Complete Meta Developer App setup (developers.facebook.com)
  - Create app → add Instagram product → get access token
- [ ] Get Segmind API key (free signup: segmind.com)
- [ ] Build instagram-post.js script (image gen + Meta API post)
- [ ] Fix instagram-content.js to add emojis throughout captions
- [ ] First weekly report (run next Sunday)
- [ ] Monitor Google Search Console for ranking improvements
- [ ] YouTube channel setup

### How to Resume Instagram API Setup
1. Go to developers.facebook.com → My Apps → rahiltherapy app
2. Add product: Instagram → set up
3. Get User Access Token with instagram_basic + instagram_content_publish permissions
4. Add token to .env as INSTAGRAM_ACCESS_TOKEN
5. Add Instagram Business Account ID to .env as INSTAGRAM_BUSINESS_ACCOUNT_ID
Then tell RuFlow to build instagram-post.js

### Instagram Status
- Account: @rahiltherapy (Professional/Creator)
- First post: LIVE ✅
- Manual posting: use instagram-schedule.md (7-day captions ready)
- Regenerate schedule: `node instagram-content.js`
- Profile pic: profile.PNG
- Bio: روانشناس عمومی | راحله اوینی‌پور + rahiltherapy.com

### Telegram Status
- Bot: @Rahiltherapy_bot
- Channel: @raheleh21 (ارامش و معنا، 50+ subscribers)
- Auto-posting: ✅ via Vercel cron (8am UTC daily)
- Format: emoji + title + 3-para summary + plain URL (opens in Safari)

### Daily Automation Status
- Runs: Vercel cron, 8am UTC (11:30am Tehran / 12pm Dubai)
- Script: api/generate-blog.js (cloud) + daily-automation.js (local test)
- Does: article → blog.html → sitemap → Telegram → deploy
- Images: fallback to cat-[topic].png (MiniMax image API not available on sk-cp plan)
- Logs: logs/automation.log

### How to Resume Next Session
Open RuFlow in raheleh_project and say:
> "Read RAHELEH_PROJECT_CONTEXT.md and continue from next steps"

### How to Resume Next Session
Open RuFlow in this folder and say:
> "Read RAHELEH_PROJECT_CONTEXT.md and continue from next steps"

### Env Variables (in .env — never commit)
- `TELEGRAM_BOT_TOKEN` — Telegram bot API token
- `TELEGRAM_CHANNEL_ID` — `-1002037624159`
- `ANTHROPIC_API_KEY` — MiniMax key (sk-cp-...)
- `ANTHROPIC_BASE_URL` — `https://api.minimax.io/anthropic`
