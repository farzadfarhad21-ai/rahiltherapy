# Blog Generator - Automated Persian Psychology Articles

## Quick Start

### 1. Set your API Key
```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 2. Run manually
```bash
cd ~/Downloads/ruflow-project/raheleh_project
node blog-generator.js
```

### 3. Run with specific topic
```bash
node blog-generator.js "اضطراب و راه‌های کنترل آن"
```

---

## Daily Automation Setup

### Option A: Setup Cron (Mac/Linux)
```bash
chmod +x setup-cron.sh
./setup-cron.sh
```

This runs the generator every day at 8am.

### Option B: Manual cron setup
```bash
crontab -e
# Add this line:
0 8 * * * ANTHROPIC_API_KEY=your_key node ~/Downloads/ruflow-project/raheleh_project/blog-generator.js >> ~/Downloads/ruflow-project/raheleh_project/logs/blog-cron.log 2>&1
```

### Option C: Vercel Cron (alternative)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/blog-cron",
    "schedule": "0 8 * * *"
  }]
}
```

---

## Topics (rotates automatically)
1. اضطراب و راه‌های کنترل آن
2. افسردگی و نشانه‌های اولیه
3. روابط سالم و مرزهای شخصی
4. عزت نفس و رابطه با خود
5. طرحواره درمانی چیست؟
6. OCD - وسواس فکری عملی
7. رشد فردی و خودشناسی
8. والدین و فرزندپروری
9. ADHD در بزرگسالان
10. ذهن‌آگاهی و مدیتیشن

---

## Output
- Articles saved to: `articles/[timestamp]-[slug].html`
- `blog.html` is automatically updated with new article card at top
- Each article includes SEO title, 3-4 sections, practical tips, and CTA

---

## API Key Setup
1. Get your key from: https://console.anthropic.com/
2. Set it: `export ANTHROPIC_API_KEY=sk-ant-xxxxx`
3. Or add to shell profile (~/.zshrc):
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```