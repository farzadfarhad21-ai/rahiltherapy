# Graph Report - agents  (2026-06-02)

## Corpus Check
- 10 files · ~3,827 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 53 nodes · 64 edges · 13 communities (7 shown, 6 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_CEO & Content Coordination|CEO & Content Coordination]]
- [[_COMMUNITY_Mental Health Topics & Website|Mental Health Topics & Website]]
- [[_COMMUNITY_Social Media & Content Distribution|Social Media & Content Distribution]]
- [[_COMMUNITY_Operations & Analysis|Operations & Analysis]]
- [[_COMMUNITY_Design System|Design System]]
- [[_COMMUNITY_Client Conversion & Services|Client Conversion & Services]]
- [[_COMMUNITY_Deployment & CICD|Deployment & CI/CD]]
- [[_COMMUNITY_Team Learning & Memory|Team Learning & Memory]]
- [[_COMMUNITY_ADHD & Self-Esteem|ADHD & Self-Esteem]]
- [[_COMMUNITY_Mindfulness|Mindfulness]]
- [[_COMMUNITY_Individual Growth|Individual Growth]]
- [[_COMMUNITY_YouTube|YouTube]]
- [[_COMMUNITY_Instagram Schedule|Instagram Schedule]]

## God Nodes (most connected - your core abstractions)
1. `rahiltherapy.com` - 19 edges
2. `CEO Agent` - 9 edges
3. `Report Agent` - 7 edges
4. `Content Agent` - 7 edges
5. `Telegram @raheleh21` - 7 edges
6. `Social Agent` - 6 edges
7. `Bug Agent` - 5 edges
8. `SEO Agent` - 5 edges
9. `Persian RTL` - 4 edges
10. `Anxiety` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Instagram` --semantically_similar_to--> `Telegram @raheleh21`  [INFERRED] [semantically similar]
  agents/social-agent.md → agents/ceo.md
- `SEO Agent` --semantically_similar_to--> `Bug Agent`  [INFERRED] [semantically similar]
  agents/seo-agent.md → agents/bug-agent.md
- `Content Agent` --semantically_similar_to--> `Social Agent`  [INFERRED] [semantically similar]
  agents/content-agent.md → agents/social-agent.md
- `Instagram Agent` --conceptually_related_to--> `rahiltherapy.com`  [EXTRACTED]
  agents/instagram-agent.md → agents/ceo.md
- `Relationships` --shares_data_with--> `Telegram @raheleh21`  [EXTRACTED]
  agents/memory.md → agents/ceo.md

## Hyperedges (group relationships)
- **Content Creation Workflow** — agents_ceo, agents_content-agent, agents_social-agent, agents_instagram-agent, blog-generator_js, instagram-content_js, instagram-schedule_md [EXTRACTED 1.00]
- **Campaign Parallel Analysis Phase** — agents_seo-agent, agents_bug-agent, agents_ceo [EXTRACTED 1.00]
- **Topical Authority Cluster** — anxiety, depression, ocd, adhd, schema_therapy, cbt, relationships, personal_growth, self-esteem, parenting, mindfulness [INFERRED 0.95]

## Communities (13 total, 6 thin omitted)

### Community 0 - "CEO & Content Coordination"
Cohesion: 0.25
Nodes (11): CEO Agent, Content Agent, Instagram Agent, Social Agent, blog-generator.js, content-strategy Skill, copywriting Skill, Every Article Needs Internal Links (+3 more)

### Community 1 - "Mental Health Topics & Website"
Cohesion: 0.20
Nodes (10): ADHD, Broken Booking Form, CBT, OCD, Online Therapy Sessions in Persian, Persian Speakers Worldwide, Dr. Raheleh Evinipour, rahiltherapy.com (+2 more)

### Community 2 - "Social Media & Content Distribution"
Cohesion: 0.32
Nodes (8): Anxiety, Depression, Emotion Opens Reach, Instagram, Instagram Carousel Format, Personal Growth, Telegram @raheleh21, Telegram Plain URLs Rule

### Community 3 - "Operations & Analysis"
Cohesion: 0.40
Nodes (6): Bug Agent, Report Agent, SEO Agent, Weekly Report Template, audit-website Skill, seo-audit Skill

### Community 4 - "Design System"
Cohesion: 0.50
Nodes (4): Markazi Text Font, Persian Mental Health Audience is Sophisticated, Persian RTL, Vazirmatn Font

### Community 5 - "Client Conversion & Services"
Cohesion: 0.50
Nodes (4): First Session Free, Parenting, Practicality Drives Bookings, Relationships

### Community 6 - "Deployment & CI/CD"
Cohesion: 0.67
Nodes (3): Before Deploy Verification, Sitemap, Vercel Deploy Command

## Knowledge Gaps
- **24 isolated node(s):** `Learning Memory`, `Learning Rules`, `Weekly Report Template`, `Dr. Raheleh Evinipour`, `Persian Speakers Worldwide` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `rahiltherapy.com` connect `Mental Health Topics & Website` to `CEO & Content Coordination`, `Social Media & Content Distribution`, `Operations & Analysis`, `Design System`, `Client Conversion & Services`?**
  _High betweenness centrality (0.509) - this node is a cross-community bridge._
- **Why does `Telegram @raheleh21` connect `Social Media & Content Distribution` to `Mental Health Topics & Website`, `Client Conversion & Services`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `Content Agent` connect `CEO & Content Coordination` to `Mental Health Topics & Website`, `Operations & Analysis`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `Learning Memory`, `Learning Rules`, `Weekly Report Template` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._