# Workflow: Personal Business Website (Small/Solo Practice)
## From Zero to Live — Full Agent Workflow Documentation
> Based on real project: rahiltherapy.com (Persian psychology website, Dubai)
> Built in one day using RuFlow + MiniMax M2.7 + Anthropic API

---

## Phase 0 — Discovery & Planning (Human + AI Chat)

### Inputs needed from client:
- [ ] Business type and specialty
- [ ] Target audience (language, location, worldwide?)
- [ ] Name, credentials, experience
- [ ] Contact info: phone/WhatsApp, email, social handles
- [ ] Pricing
- [ ] Color preference / mood
- [ ] Example websites they like
- [ ] Professional photos (or AI-generate)

### Agent task: Research competitors
```
Search for [specialty] + [language] + [location] websites
Identify: what pages they have, what keywords they rank for,
what's missing in the market (opportunity gaps)
```

### Output: Project brief document with:
- All 8 pages defined
- Color palette chosen
- Domain name options (check availability)
- SEO keyword targets identified

---

## Phase 1 — Design (Claude.ai Artifacts OR Design Tool)

### Step 1.1 — Homepage mockup
- Show 2-3 style options (calm/classic, modern/light, warm/cozy)
- Client picks one
- Design all sections: hero, trust bar, services, about teaser, blog preview, testimonials, CTA, footer

### Step 1.2 — Full page list design
Design wireframe/mockup for each page:
1. Home
2. About
3. Services
4. Booking/Contact
5. Blog listing
6. Single blog post
7. FAQ
8. Contact

### Step 1.3 — Export from design tool
- Export as HTML/CSS files
- Rename all files to clean English names (no Persian/special chars in filenames!)
- Verify all internal links use English filenames

---

## Phase 2 — Setup (One-time, before coding)

### Step 2.1 — Install MiniMax in RuFlow
```bash
cat > ~/.claude/settings.json << 'EOF'
{
  "enabledPlugins": {"vercel@claude-plugins-official": true},
  "theme": "auto",
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimax.io/anthropic",
    "ANTHROPIC_API_KEY": "YOUR_MINIMAX_KEY"
  },
  "model": "MiniMax-M2.7"
}
EOF
```

### Step 2.2 — Create project folder
```bash
mkdir -p ~/Downloads/ruflow-project/[project-name]
```

### Step 2.3 — Move design files into project
```bash
unzip design-export.zip -d ~/Downloads/ruflow-project/[project-name]/
```

### Step 2.4 — Register domain
- Use Namecheap
- Choose: name.com or name-[specialty].com
- Point to Vercel: ns1.vercel-dns.com / ns2.vercel-dns.com

---

## Phase 3 — Backend Build (RuFlow Multi-Agent)

### Agent 1 — File Cleanup Agent
```
Rename all HTML files to clean English names
Fix all internal links to use new names
Add SEO meta tags to all pages
Add Open Graph tags for WhatsApp/Telegram sharing
Create sitemap.xml
Create robots.txt
Create vercel.json with clean URLs and rewrites
```

### Agent 2 — Content Agent
```
Replace all placeholder contact info with real data:
- Phone/WhatsApp number
- Email address
- Social media handles
- Pricing
Add floating WhatsApp button to all pages
Add Google Analytics tag to all pages
```

### Agent 3 — Form Backend Agent
```
Connect booking form to WhatsApp:
- On submit → open WhatsApp with pre-filled message
- Include all form fields in message
- Show success message after submit
Connect contact form same way
```

### Agent 4 — Blog Automation Agent
```
Create blog-generator.js:
- Uses Anthropic API (claude-sonnet-4-5)
- Rotates through topic list
- Writes 600-800 word article in target language
- Creates article HTML file in articles/ folder
- Adds card to blog.html automatically
- Each category has unique image

Create Vercel cron:
- api/generate-blog.js endpoint
- vercel.json cron: "0 8 * * *" (8am UTC daily)
- Uses ANTHROPIC_API_KEY from Vercel env vars
```

### Agent 5 — SEO Agent
```
Add schema markup (LocalBusiness/Person)
Optimize meta descriptions for target keywords
Ensure all article URLs are clean English slugs
Add canonical tags
Submit sitemap to Google Search Console
```

---

## Phase 4 — Images (Midjourney)

### For therapist/coach/consultant websites:

**Hero portrait** (use Omni Reference with real photo):
```
Professional [specialty] in their [age]s, warm confident smile,
sitting at minimal desk, bright modern office, natural window light,
professional headshot, photorealistic --ar 3:4
```

**Service images** (8 different scenes, no face needed):
```
[Scene description matching service], warm therapy office setting,
rose and cream tones, bookshelves, natural light, cinematic --ar 3:4
```

**Blog category images** (10 topics):
```
[Visual metaphor for topic], soft lifestyle photography,
cream and rose tones, warm natural light --ar 16:9 --style raw
```

### ⚠️ Critical image rules:
- All images go in ROOT folder (not images/ subfolder) — Vercel serves from root
- Articles use ../image.png (one level up)
- Blog cards use image.png (root level)
- Hero uses hero-portrait.jpg
- About uses about-hero.jpg
- Categories use cat-[topic].png

---

## Phase 5 — Deployment

### Step 5.1 — Deploy to Vercel
```bash
cd ~/Downloads/ruflow-project/[project-name]
npx vercel deploy --yes --prod --force
```

### Step 5.2 — Connect custom domain
In RuFlow: "Connect domain [name.com] to this Vercel project"
Copy DNS records → add to Namecheap or use Vercel nameservers

### Step 5.3 — Set environment variables
Vercel Dashboard → Project → Settings → Environment Variables:
- ANTHROPIC_API_KEY = your key

### Step 5.4 — Google Search Console
- Go to search.google.com/search-console
- Add property → URL prefix → https://[domain]
- Download HTML verification file → add to project → deploy → verify
- Submit sitemap: sitemap.xml

### Step 5.5 — Google Analytics
- analytics.google.com → create property
- Get Measurement ID (G-XXXXXXXXXX)
- Add to all HTML pages in <head>

---

## Phase 6 — Content Generation

### Generate initial articles (run locally):
```bash
export ANTHROPIC_API_KEY=your_key
for topic in "topic1" "topic2" "topic3" "topic4" "topic5"; do
  node blog-generator.js "$topic"
done
```

### Deploy articles:
```bash
npx vercel deploy --yes --prod --force
```

---

## Problems We Hit & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Persian filenames broke | OS encoded them as #UXXXX | Python script to rename using glob + os.rename |
| Images not loading on Vercel | Images were in images/ subfolder | Move ALL images to root folder |
| Both pages showing same photo | index.html used same filename twice | Explicitly change line numbers in HTML |
| Blog cards all linking to same article | blog.html had hardcoded href="/blog.html" | Python sed to map each card to correct article |
| MiniMax auth conflict | Both claude.ai login AND API key set | Run /logout, confirm API key |
| Wrong MiniMax model name | MiniMax-Text-01 doesn't exist | Use MiniMax-M2.7 |
| Wrong MiniMax base URL | /v1 endpoint is OpenAI format | Use /anthropic endpoint |
| Blog generator 401 error | API key not exported in terminal | export ANTHROPIC_API_KEY before running |
| categoryImage declared twice | Duplicate const in JS | Remove duplicate, keep one declaration |
| Article images showing old photo | Browser cache | Test in incognito window |
| Articles using wrong image path | articles/ subfolder needs ../ prefix | Use ../cat-[topic].png in article template |
| Cron job needs Mac to be on | Local cron | Use Vercel cron (api/ folder + vercel.json) |
| Email forwarding not working | Using Vercel DNS, not Namecheap DNS | Use Gmail directly or Cloudflare email routing |
| Navbar links 404 | Persian href values in HTML | Replace all Persian hrefs with English filenames |

---

## Agent Workflow Template (for future automation)

```
ORCHESTRATOR AGENT
├── Input: client brief (name, specialty, language, contact, pricing, colors)
├── 
├── SUBAGENT 1: Research Agent
│   ├── Search competitor websites
│   ├── Identify keyword gaps
│   └── Output: keywords list + page structure recommendation
│
├── SUBAGENT 2: Design Agent  
│   ├── Generate HTML/CSS for all pages
│   ├── Apply brand colors and fonts
│   └── Output: complete HTML/CSS files
│
├── SUBAGENT 3: Content Agent
│   ├── Replace all placeholders with real client data
│   ├── Write all page copy in target language
│   └── Output: populated HTML files
│
├── SUBAGENT 4: Backend Agent
│   ├── Connect forms to WhatsApp
│   ├── Add analytics + SEO tags
│   ├── Create blog automation script
│   └── Output: working backend
│
├── SUBAGENT 5: Image Agent
│   ├── Generate Midjourney prompts
│   ├── (Human generates images)
│   ├── Assign images to correct pages
│   └── Output: all images placed correctly
│
├── SUBAGENT 6: Deploy Agent
│   ├── Deploy to Vercel
│   ├── Connect domain
│   ├── Set up Google Search Console
│   ├── Set up Google Analytics
│   └── Output: live URL
│
└── SUBAGENT 7: Content Generation Agent
    ├── Generate initial 5-10 blog articles
    ├── Set up daily cron automation
    └── Output: SEO content engine running
```

---

## Time Estimate Per Phase
| Phase | Time |
|-------|------|
| Discovery & Planning | 30 min |
| Design | 1-2 hours |
| Setup | 15 min |
| Backend Build | 1-2 hours |
| Images | 1 hour |
| Deployment | 30 min |
| Content Generation | 30 min |
| **Total** | **4-6 hours** |

---

## Cost Estimate
| Item | Cost |
|------|------|
| Domain (Namecheap) | ~$12/year |
| Vercel hosting | FREE |
| MiniMax (RuFlow coding) | ~$5-10/month |
| Anthropic API (blog posts) | ~$2-5/month |
| Midjourney (images) | $10/month |
| **Total** | **~$30/month** |

