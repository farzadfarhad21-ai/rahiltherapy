/**
 * daily-automation.js
 * Daily automation script - runs at 8am
 * 1. Pick trending Persian mental health topic
 * 2. Generate blog article
 * 3. Generate image via MiniMax API
 * 4. Post to Telegram (photo + caption)
 * 5. Update sitemap.xml
 * 6. Deploy to Vercel
 * 7. Log everything
 */

const path = require('path');

const fs = require('fs');
const { execSync } = require('child_process');

// Public URLs must never include .html — Vercel's cleanUrls setting 308-redirects
// .html paths to the clean equivalent, which splits Google's ranking signal
// between two URLs for the same page. Filesystem paths (fs.readFileSync/writeFileSync)
// still need the real .html filename — only strip it when building a URL.
const toSlug = (fname) => fname.replace(/\.html$/, '');

// Rotation updated 2026-09-04 at Farzad's request.
//
// وسواس is deliberately NOT in this list. It is the only topic already covered by a
// hand-written cluster (depth-erp-ocd + depth-ocd-types + depth-pure-o +
// depth-ocd-religious), and depth-erp-ocd is the single best-performing page on the
// site. findTopicArticle() only matches `{timestamp}-{slug}.html`, so an "ocd" entry
// here would CREATE a rival page rather than refresh the cluster. Add it only if you
// also teach findTopicArticle() to target depth-erp-ocd.html.
//
// NLP and ضمیر ناخودآگاه are framed as evidence reviews, not endorsements. Both were
// dropped in July as E-E-A-T liabilities on a licensed psychologist's YMYL site;
// covering them critically keeps the search traffic without staking her credibility
// on methods that lack support.
//
// Two pairs share an English slug on purpose, so they deepen ONE page instead of
// competing: هوش هیجانی + افزایش هوش هیجانی -> emotional-intelligence, and
// مدیریت احساسات + تنظیم و مدیریت هیجان -> emotion-regulation.
const TOPICS = [
  'افسردگی',
  'اضطراب',
  'مقابله با تنبلی',
  'دروغ',
  'شکرگزاری',
  'برنامه‌ریزی عصبی کلامی (NLP)',
  'اختلال شخصیت خودشیفته',
  'هوش هیجانی',
  'افزایش هوش هیجانی',
  'مدیریت خشم از دیدگاه تئوری انتخاب',
  'ضمیر ناخودآگاه',
  'قدرت تفکر',
  'تاب‌آوری',
  'دسته‌بندی احساسات',
  'مدیریت احساسات',
  'تنظیم و مدیریت هیجان',
  'تفکیک و مدیریت استرس',
  'مدیریت زمان',
  'تمرکز و دوری از عجله'
];

const TOPIC_FULL = {
  'افسردگی': 'افسردگی؛ نشانه‌ها، ریشه‌ها و مسیر درمان مبتنی بر شواهد',
  'اضطراب': 'اضطراب؛ چرا بدن زنگ خطر می‌زند و چگونه آرامش کنیم',
  'مقابله با تنبلی': 'مقابله با تنبلی و اهمال‌کاری؛ چرا شروع کردن سخت‌تر از انجام دادن است',
  'دروغ': 'روان‌شناسی دروغ؛ چرا دروغ می‌گوییم و چه چیزی پشت آن پنهان است',
  'شکرگزاری': 'شکرگزاری؛ آنچه پژوهش‌ها واقعاً درباره تأثیر آن بر خلق نشان می‌دهند',
  'برنامه‌ریزی عصبی کلامی (NLP)': 'برنامه‌ریزی عصبی-کلامی (NLP)؛ ادعاها، شواهد پژوهشی و آنچه واقعاً کار می‌کند',
  'اختلال شخصیت خودشیفته': 'اختلال شخصیت خودشیفته؛ نشانه‌ها، ریشه‌ها و زندگی در کنار فرد خودشیفته',
  'هوش هیجانی': 'هوش هیجانی؛ چهار مهارتی که کیفیت روابط را تعیین می‌کند',
  'افزایش هوش هیجانی': 'افزایش هوش هیجانی؛ تمرین‌های عملی برای رشد مهارت‌های هیجانی',
  'مدیریت خشم از دیدگاه تئوری انتخاب': 'مدیریت خشم از دیدگاه تئوری انتخاب؛ خشم به‌عنوان یک انتخاب رفتاری',
  'ضمیر ناخودآگاه': 'ضمیر ناخودآگاه؛ آنچه روان‌شناسی علمی می‌گوید و آنچه نمی‌گوید',
  'قدرت تفکر': 'قدرت تفکر؛ چگونه افکار بر هیجان و رفتار اثر می‌گذارند',
  'تاب‌آوری': 'تاب‌آوری؛ چه چیزی باعث می‌شود بعضی افراد پس از بحران بازسازی کنند',
  'دسته‌بندی احساسات': 'دسته‌بندی احساسات؛ چرا نام‌گذاری دقیق هیجان‌ها آن‌ها را قابل‌مدیریت می‌کند',
  'مدیریت احساسات': 'مدیریت احساسات؛ از سرکوب و انفجار تا پاسخ سنجیده',
  'تنظیم و مدیریت هیجان': 'تنظیم هیجان؛ راهبردهای مؤثر و راهبردهایی که نتیجه معکوس می‌دهند',
  'تفکیک و مدیریت استرس': 'مدیریت استرس؛ تفکیک آنچه در کنترل ماست از آنچه نیست',
  'مدیریت زمان': 'مدیریت زمان؛ چرا برنامه‌ریزی بدون مرزگذاری شکست می‌خورد',
  'تمرکز و دوری از عجله': 'تمرکز؛ چگونه ذهن پرشتاب را به کار عمیق بازگردانیم'
};

const CATEGORY_IMAGES = {
  'افسردگی': 'cat-depression.jpg',
  'اضطراب': 'cat-anxiety.jpg',
  'مقابله با تنبلی': 'cat-growth.jpg',
  'دروغ': 'cat-relationships.jpg',
  'شکرگزاری': 'cat-mindfulness.jpg',
  'برنامه‌ریزی عصبی کلامی (NLP)': 'cat-selfawareness.jpg',
  'اختلال شخصیت خودشیفته': 'cat-relationships.jpg',
  'هوش هیجانی': 'cat-relationships.jpg',
  'افزایش هوش هیجانی': 'cat-relationships.jpg',
  'مدیریت خشم از دیدگاه تئوری انتخاب': 'cat-anxiety.jpg',
  'ضمیر ناخودآگاه': 'cat-selfawareness.jpg',
  'قدرت تفکر': 'cat-selfawareness.jpg',
  'تاب‌آوری': 'cat-growth.jpg',
  'دسته‌بندی احساسات': 'cat-selfawareness.jpg',
  'مدیریت احساسات': 'cat-mindfulness.jpg',
  'تنظیم و مدیریت هیجان': 'cat-mindfulness.jpg',
  'تفکیک و مدیریت استرس': 'cat-anxiety.jpg',
  'مدیریت زمان': 'cat-growth.jpg',
  'تمرکز و دوری از عجله': 'cat-mindfulness.jpg'
};

const IMAGE_PROMPTS = {
  'افسردگی': 'Person sitting by a rain-streaked window in soft grey light, quiet heaviness, muted cream and slate tones, intimate documentary photography',
  'اضطراب': 'Person with hand on chest taking a slow deliberate breath, calm focus, soft window light, warm cream tones, intimate lifestyle photography',
  'مقابله با تنبلی': 'Desk with a single open notebook and morning light, one small task begun, warm cream tones, calm minimal lifestyle photography',
  'دروغ': 'Two people in conversation with a subtle gap between them, honest tension, soft afternoon light, cream and rose tones, cinematic portrait',
  'شکرگزاری': 'Hands writing in a gratitude journal at a sunlit table with tea, quiet warmth, cream and amber tones, lifestyle photography',
  'برنامه‌ریزی عصبی کلامی (NLP)': 'Open research journals and reading glasses on a wooden desk under warm lamp light, careful study, cream tones, editorial still life',
  'اختلال شخصیت خودشیفته': 'Fragmented reflection of a person across several mirror panels, conceptual portrait, warm cream and rose tones, photorealistic',
  'هوش هیجانی': 'Two people in warm empathetic conversation in a sunlit cafe, genuine attunement, cream and rose tones, photorealistic',
  'افزایش هوش هیجانی': 'Person listening attentively with open posture in a warm room, practising presence, soft light, cream tones, intimate photography',
  'مدیریت خشم از دیدگاه تئوری انتخاب': 'Person pausing at a crossroads path in soft morning light, deliberate choice, warm cream tones, conceptual photorealistic',
  'ضمیر ناخودآگاه': 'Soft layered light beneath still water surface, depth and clarity, muted cream and blue tones, abstract conceptual photography',
  'قدرت تفکر': 'Person in quiet reflection by a window with soft daylight on their face, clear thought, cream tones, intimate portrait',
  'تاب‌آوری': 'A single resilient plant growing through a crack in stone in morning light, warm cream and green tones, photorealistic',
  'دسته‌بندی احساسات': 'Hand-written emotion words arranged on cards across a warm wooden table, soft daylight, cream tones, editorial flat lay',
  'مدیریت احساسات': 'Person seated calmly with eyes closed in a quiet warm room, steady composure, soft window light, cream tones, intimate photography',
  'تنظیم و مدیریت هیجان': 'Calm hands resting on a warm ceramic mug, grounded stillness, soft morning light, cream and amber tones, lifestyle photography',
  'تفکیک و مدیریت استرس': 'Person sorting papers into two clear piles at a calm desk, deliberate order, warm daylight, cream tones, lifestyle photography',
  'مدیریت زمان': 'Simple weekly planner open beside a cup of tea in morning light, calm structure, cream tones, minimal lifestyle photography',
  'تمرکز و دوری از عجله': 'Single lit workspace with one open book and everything else in soft shadow, deep focus, warm cream tones, cinematic photography'
};

const LOG_FILE = path.join(__dirname, 'logs', 'automation.log');
const BLOG_DIR = path.join(__dirname, 'articles');
const SITE_URL = 'https://rahiltherapy.com';

/**
 * Append UTM tracking params to a URL.
 * Use ONLY on URLs shared to Telegram/Instagram — never on canonical, og:url,
 * JSON-LD, sitemap, or checkDeployedUrl targets.
 */
function withUtm(url, source, medium = 'social', campaign = 'daily-blog') {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', source);
    u.searchParams.set('utm_medium', medium);
    u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch (_) {
    return url; // fallback: return URL unchanged
  }
}

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${type}] ${message}`;
  console.log(logLine);

  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(LOG_FILE, logLine + '\n', 'utf8');
}

function getTodayTopic() {
  const dayIndex = Math.floor(Date.now() / 86400000) % TOPICS.length;
  const topicKey = TOPICS[dayIndex];
  return { key: topicKey, full: TOPIC_FULL[topicKey] };
}

function getTag(topicKey) {
  const map = {
    'افسردگی': 'افسردگی',
    'اضطراب': 'اضطراب',
    'مقابله با تنبلی': 'انگیزه',
    'دروغ': 'روابط',
    'شکرگزاری': 'ذهن‌آگاهی',
    'برنامه‌ریزی عصبی کلامی (NLP)': 'روان‌شناسی علمی',
    'اختلال شخصیت خودشیفته': 'شخصیت',
    'هوش هیجانی': 'هوش هیجانی',
    'افزایش هوش هیجانی': 'هوش هیجانی',
    'مدیریت خشم از دیدگاه تئوری انتخاب': 'خشم',
    'ضمیر ناخودآگاه': 'روان‌شناسی علمی',
    'قدرت تفکر': 'شناخت',
    'تاب‌آوری': 'تاب‌آوری',
    'دسته‌بندی احساسات': 'هیجان',
    'مدیریت احساسات': 'هیجان',
    'تنظیم و مدیریت هیجان': 'هیجان',
    'تفکیک و مدیریت استرس': 'استرس',
    'مدیریت زمان': 'بهره‌وری',
    'تمرکز و دوری از عجله': 'تمرکز'
  };
  return map[topicKey] || 'روانشناسی';
}

const TOPIC_ENGLISH = {
  'افسردگی': 'depression',
  'اضطراب': 'anxiety',
  'مقابله با تنبلی': 'procrastination',
  'دروغ': 'lying',
  'شکرگزاری': 'gratitude',
  'برنامه‌ریزی عصبی کلامی (NLP)': 'nlp',
  'اختلال شخصیت خودشیفته': 'narcissism',
  'هوش هیجانی': 'emotional-intelligence',
  'افزایش هوش هیجانی': 'emotional-intelligence',
  'مدیریت خشم از دیدگاه تئوری انتخاب': 'choice-theory',
  'ضمیر ناخودآگاه': 'subconscious',
  'قدرت تفکر': 'power-of-thought',
  'تاب‌آوری': 'resilience',
  'دسته‌بندی احساسات': 'emotion-vocabulary',
  'مدیریت احساسات': 'emotion-regulation',
  'تنظیم و مدیریت هیجان': 'emotion-regulation',
  'تفکیک و مدیریت استرس': 'stress-management',
  'مدیریت زمان': 'time-management',
  'تمرکز و دوری از عجله': 'focus'
};

function getEnglishName(topicKey) {
  return TOPIC_ENGLISH[topicKey] || 'article';
}

function getCategoryImage(topicKey) {
  return CATEGORY_IMAGES[topicKey] || 'cat-growth.jpg';
}

function getPersianDate() {
  return new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function slugify(text) {
  // ASCII-only slugs — safe for Vercel routing and all browsers
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// The model is asked for an explicit <!--DESCRIPTION:...--> line. If it forgets,
// fall back to the opening paragraph trimmed to a word boundary. Never returns ''
// for a real article — an empty meta description shipped silently for two months.
function extractExcerpt(rawContent, articleHtml) {
  const tagged = rawContent && rawContent.match(/<!--\s*DESCRIPTION:([\s\S]*?)-->/);
  if (tagged) {
    const d = tagged[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (d.length >= 60) return truncateAtWord(d, 160);
  }
  const pMatch = articleHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!pMatch) return '';
  const text = pMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return truncateAtWord(text, 160);
}

function truncateAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[،,;:\-\s]+$/, '') + '…';
}

// Meta descriptions live inside HTML attributes — a stray quote breaks the tag.
function attr(text) {
  return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toFaDate(ts) {
  return new Date(ts).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function toIsoDate(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

// The visible date used to be written by the model from a prompt placeholder, so
// every post was stamped with the model's idea of "today" (May 2025) while the
// schema said otherwise. It is computed here now and never asked for.
function renderDateTag(ts) {
  return `<time datetime="${toIsoDate(ts)}">${toFaDate(ts)}</time>`;
}

function buildMetaLine(tag, publishedTs, modifiedTs, readMinutes) {
  const parts = [tag, renderDateTag(publishedTs)];
  if (modifiedTs && toIsoDate(modifiedTs) !== toIsoDate(publishedTs)) {
    parts.push(`بروزرسانی: ${renderDateTag(modifiedTs)}`);
  }
  parts.push(`مدت زمان: ${readMinutes}`);
  return `<div class="meta">${parts.join(' · ')}</div>`;
}

function readMinutesOf(articleHtml) {
  const words = articleHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  const n = Math.max(3, Math.round(words / 200));
  return `${n.toLocaleString('fa-IR')} دقیقه`;
}

// Replace whatever meta line the model produced with an authoritative one.
function normalizeMetaLine(articleHtml, tag, publishedTs, modifiedTs) {
  const line = buildMetaLine(tag, publishedTs, modifiedTs, readMinutesOf(articleHtml));
  if (/<div class="meta">[\s\S]*?<\/div>/.test(articleHtml)) {
    return articleHtml.replace(/<div class="meta">[\s\S]*?<\/div>/, line);
  }
  return articleHtml.replace(/(<h1>[\s\S]*?<\/h1>)/, `$1\n${line}`);
}

// The one live, indexable article for a topic. After consolidation there is
// exactly one; if the folder ever drifts, prefer the longest.
function findTopicArticle(topicKey) {
  const englishName = getEnglishName(topicKey);
  if (!fs.existsSync(BLOG_DIR)) return null;
  const candidates = fs.readdirSync(BLOG_DIR)
    .filter(f => /^\d+-/.test(f) && f.endsWith(`-${englishName}.html`))
    .map(f => {
      const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      return { file: f, html, noindex: /name="robots"[^>]*noindex/.test(html) };
    })
    .filter(c => !c.noindex);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.html.length - a.html.length);
  return candidates[0].file;
}

function getPreviousTitlesForTopic(topicKey) {
  const englishName = getEnglishName(topicKey);
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith(`-${englishName}.html`));
  const titles = [];
  for (const f of files) {
    try {
      const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      const m = html.match(/<h1>(.*?)<\/h1>/);
      if (m) titles.push(m[1].replace(/<[^>]+>/g, '').trim());
    } catch (_) {}
  }
  return titles;
}

async function generateBlogPost(topicKey, topicFull) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const tag = getTag(topicKey);
  const previousTitles = getPreviousTitlesForTopic(topicKey);
  const dedupeBlock = previousTitles.length > 0
    ? `\n⚠️ مقالات قبلی منتشر شده درباره همین موضوع:\n${previousTitles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\n\nمقاله جدید باید:\n- زاویه‌ای کاملاً متفاوت و تازه نسبت به موارد بالا داشته باشد\n- عنوان متفاوتی داشته باشد (نه شبیه و نه کلمات تکراری)\n- مثال‌ها و تمرین‌های متفاوت ارائه دهد\n- یک جنبه جدید از موضوع را پوشش دهد (مثلاً: تمرین عملی خاص، یک سوءتفاهم رایج، یک گروه سنی خاص، یک رویکرد درمانی متفاوت)\n`
    : '';

  const prompt = `تو راحله اوینی‌پور هستی — روان‌شناس فارسی‌زبان مقیم دبی، با قلمی گرم، حرفه‌ای و علمی.
یک مقاله وبلاگی درباره "${topicFull}" بنویس.
${dedupeBlock}

لحن و سبک — این مهم‌ترین بخش است:
- لحن گرم، انسانی و قابل اعتماد، اما حرفه‌ای و علمی — نه شاعرانه
- ❌ از شعر، بیت، استعاره‌های ادبی، یا ارجاع به حافظ/مولانا/سعدی استفاده نکن
- ❌ از زبان شاعرانه، غزل‌گونه یا ادبی استفاده نکن
- ✅ نوشتار باید شبیه یک روان‌شناس واقعی باشد که با مهربانی توضیح می‌دهد
- ✅ بر مفاهیم علمی و اثبات‌شده روان‌شناسی تکیه کن (CBT، طرحواره‌درمانی، دلبستگی، و غیره)
- ✅ مثال‌های واقعی و کاربردی از زندگی روزمره بزن
- ✅ سؤال‌هایی بپرس که خواننده را به تأمل علمی درباره خودش ببرد
- ✅ احساس بده که یک روان‌شناس متخصص با تجربه دارد توضیح می‌دهد، نه یک شاعر
- اگر مرجع علمی مرتبط داری (DSM-5, APA, WHO, محققان مشهور)، اشاره کن

قوانین ساختاری:
- ۷۰۰ تا ۹۰۰ کلمه
- ۱ عنوان جذاب و کاربردی (نه شاعرانه، نه آکادمیک خشک)
- مقدمه‌ای که خواننده را با یک مثال واقعی یا سؤال عملی درگیر کند
- ۳ تا ۴ بخش با عنوان‌های روشن و واضح (h3)
- ۱ بخش «یک قدم کوچک» با ۳ تمرین عملی و علمی
- ۱ نتیجه‌گیری گرم با دعوت ملایم به رزرو جلسه
- برچسب: ${tag}

ساختار خروجی (فقط HTML، بدون توضیح):

<!--DESCRIPTION:[توضیح متای صفحه — یک جمله کامل و جذاب فارسی، بین ۱۲۰ تا ۱۵۵ کاراکتر، بدون نقل‌قول، که موضوع مقاله را دقیق توصیف کند]-->
<article class="blog-article">
<h1>[عنوان]</h1>
<div class="meta">__META__</div>
<p>[مقدمه — با تصویر یا سؤال یا لحظه شروع کن]</p>
<h3>[عنوان بخش ۱]</h3>
<p>[محتوا]</p>
<h3>[عنوان بخش ۲]</h3>
<p>[محتوا]</p>
<h3>[عنوان بخش ۳]</h3>
<p>[محتوا]</p>
<h3>یک قدم کوچک</h3>
<ul>
<li>[تمرین ۱]</li>
<li>[تمرین ۲]</li>
<li>[تمرین ۳]</li>
</ul>
<h3>در پایان</h3>
<p>[جمع‌بندی گرم + دعوت ملایم]</p>
</article>

مهم: فقط و فقط HTML برگردان، بدون هیچ متن اضافی.
مهم: خط <!--DESCRIPTION:...--> اجباری است و باید قبل از <article> بیاید.
مهم: <div class="meta"> را دقیقاً به‌صورت __META__ بنویس — تاریخ را خودت ننویس.`;

  log(`Generating article for topic: ${topicFull}`);

  const provider = process.env.GENERATION_PROVIDER || 'ruflo';
  const baseUrl = provider === 'anthropic'
    ? 'https://api.anthropic.com'
    : (process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic');

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 10000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  console.log('API Response content types:', data.content?.map(c => c.type));
  console.log('First block keys:', Object.keys(data.content?.[0] || {}));

  let rawContent;
  if (data.content && data.content.length > 0) {
    const textBlock = data.content.find(c => c.type === 'text');
    if (textBlock) {
      rawContent = textBlock.text;
    } else if (data.content[0].type === 'thinking') {
      // MiniMax: thinking block has content array with text parts
      const thinkingBlock = data.content[0];
      if (thinkingBlock.content && Array.isArray(thinkingBlock.content)) {
        const textPart = thinkingBlock.content.find(c => c.text);
        if (textPart) {
          rawContent = textPart.text;
        } else {
          rawContent = JSON.stringify(thinkingBlock.content);
        }
      } else if (thinkingBlock.text) {
        rawContent = thinkingBlock.text;
      } else {
        rawContent = JSON.stringify(thinkingBlock);
      }
    } else {
      rawContent = JSON.stringify(data.content[0]);
    }
  } else {
    throw new Error('No content in API response');
  }
  const articleMatch = rawContent.match(/<article class="blog-article">[\s\S]*?<\/article>/);
  if (!articleMatch) throw new Error('Failed to parse generated article');

  const timestamp = Date.now();
  let articleHtml = articleMatch[0];
  const titleMatch = articleHtml.match(/<h1>(.*?)<\/h1>/);
  const seoTitle = titleMatch ? titleMatch[1] : topicFull;
  const date = toFaDate(timestamp);
  const excerpt = extractExcerpt(rawContent, articleHtml);
  if (!excerpt) throw new Error('Could not derive a meta description — refusing to publish an article with an empty description');
  articleHtml = normalizeMetaLine(articleHtml, tag, timestamp, null);
  const categoryImage = getCategoryImage(topicKey);
  const imagePrompt = IMAGE_PROMPTS[topicKey] || 'Peaceful therapy room with warm light and plants, soft cream tones, calming atmosphere';
  const articleImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=630&nologo=true&seed=${Date.now()}`;

  const filename = `${timestamp}-${getEnglishName(topicKey)}.html`;
  const filepath = path.join(BLOG_DIR, filename);

  const fullArticle = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${attr(seoTitle)} — راحله اوینی‌پور</title>
<meta name="description" content="${attr(excerpt)}">
<link rel="canonical" href="https://rahiltherapy.com/articles/${toSlug(filename)}">
<meta property="og:title" content="${attr(seoTitle)}">
<meta property="og:description" content="${attr(excerpt)}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://rahiltherapy.com/articles/${toSlug(filename)}">
<meta property="og:image" content="https://rahiltherapy.com/${getCategoryImage(topicKey)}">
<meta property="og:locale" content="fa_IR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(seoTitle)}">
<meta name="twitter:description" content="${attr(excerpt)}">

<!-- Article Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(seoTitle)},
  "description": ${JSON.stringify(excerpt)},
  "image": "https://rahiltherapy.com/${getCategoryImage(topicKey)}",
  "author": {
    "@type": "Person",
    "name": "راحله اوینی‌پور",
    "jobTitle": "روانشناس عمومی",
    "url": "https://rahiltherapy.com/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "راحله اوینی‌پور — رهیل تراپی",
    "logo": {"@type": "ImageObject", "url": "https://rahiltherapy.com/profile.jpg"}
  },
  "datePublished": "${toIsoDate(timestamp)}",
  "dateModified": "${toIsoDate(timestamp)}",
  "inLanguage": "fa",
  "articleSection": ${JSON.stringify(tag)},
  "mainEntityOfPage": "https://rahiltherapy.com/articles/${toSlug(filename)}"
}
</script>
<!-- BreadcrumbList Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "خانه", "item": "https://rahiltherapy.com/"},
    {"@type": "ListItem", "position": 2, "name": "بلاگ", "item": "https://rahiltherapy.com/blog"},
    {"@type": "ListItem", "position": 3, "name": ${JSON.stringify(seoTitle)}, "item": "https://rahiltherapy.com/articles/${toSlug(filename)}"}
  ]
}
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8TSXZKEW9N"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-8TSXZKEW9N');
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&family=Markazi+Text:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="../styles.css">
<style>
.article-wrap{max-width:760px;margin:0 auto;padding:60px 26px;}
.article-wrap h1{font-size:44px;margin:0 0 20px;color:var(--ink);}
.article-wrap .meta{color:var(--muted);font-size:14px;margin-bottom:32px;}
.article-wrap h3{font-size:26px;margin:36px 0 14px;color:var(--rose-2);}
.article-wrap p{font-size:17px;line-height:2;color:#3a3230;margin:0 0 18px;}
.article-wrap ul{font-size:16px;line-height:2.2;color:#3a3230;padding-right:24px;margin:0 0 24px;}
.article-wrap li{margin-bottom:8px;}
.practical-box{background:var(--blush);border-radius:18px;padding:24px 28px;margin:36px 0;}
.practical-box h3{margin-top:0;font-size:22px;}
.cta-final{background:linear-gradient(160deg,var(--rose-soft),var(--rose));color:#fff;border-radius:20px;padding:32px;text-align:center;margin:50px 0 0;}
.cta-final h3{color:#fff;font-size:24px;margin:0 0 12px;}
.cta-final p{margin:0 0 22px;opacity:.9;}
.cta-final .btn{background:#fff;color:var(--rose-2);padding:14px 32px;border-radius:999px;font-weight:700;}
</style>
</head>
<body>
<header id="hdr">
  <div class="container nav">
    <a class="logo" href="/"><span class="mk"></span>راحله اوینی‌پور</a>
    <nav class="navlinks">
      <a href="/services">خدمات</a>
      <a href="/about">درباره من</a>
      <a href="/blog" class="active">مقالات</a>
      <a href="/contact">تماس</a>
    </nav>
    <div class="navcta">
      <a class="btn btn-fill" href="/booking">رزرو جلسه</a>
    </div>
  </div>
</header>

<main class="article-wrap">
<img src="${articleImage}" alt="${seoTitle}" style="width:100%;height:320px;object-fit:cover;object-position:center;border-radius:20px;margin-bottom:40px;" onerror="this.src='../${categoryImage}'">
${articleHtml}
<!-- Internal links: services + booking -->
<div style="background:#FBF5F0;border:1px solid #E8D0C7;border-radius:16px;padding:24px 28px;margin:32px 0;">
  <p style="font-family:'Markazi Text',serif;font-size:20px;color:#3B2E2A;margin:0 0 12px;">می‌خواهید بیشتر بدانید یا قدم بعدی را بردارید؟</p>
  <ul style="margin:0;padding-right:20px;font-size:15px;line-height:2;">
    <li><a href="/services" style="color:#9C6A60;font-weight:600;">خدمات روان‌درمانی</a> — CBT، طرحواره‌درمانی، درمان اضطراب، افسردگی، OCD و عزت نفس</li>
    <li><a href="/booking" style="color:#9C6A60;font-weight:600;">رزرو جلسه‌ٔ اول رایگان</a> — برای آشنایی و ارزیابی نیاز شما</li>
    <li><a href="/about" style="color:#9C6A60;font-weight:600;">درباره راحله اوینی‌پور</a> — تخصص، تجربه و رویکرد درمانی</li>
    <li><a href="/dubai" style="color:#9C6A60;font-weight:600;">ایرانیان مقیم دبی</a> — جلسات حضوری و آنلاین</li>
  </ul>
</div>
<div style="background:linear-gradient(135deg,#F4E9E2,#FBF5F0);border-radius:20px;padding:40px;text-align:center;margin:48px 0;">
  <p style="font-family:'Markazi Text',serif;font-size:28px;color:#3B2E2A;margin-bottom:8px;">آماده‌اید قدم بعدی را بردارید؟</p>
  <p style="color:#806B63;margin-bottom:24px;font-size:15px;">جلسه اول رایگان — از طریق Zoom، WhatsApp یا Google Meet</p>
  <a href="/booking" style="display:block;background:#9C6A60;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:600;text-align:center;margin-bottom:10px;">رزرو جلسه رایگان</a>
  <a href="https://wa.me/989124228995" target="_blank" style="display:block;background:#25D366;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:600;text-align:center;">واتساپ</a>
</div>
</main>

<footer class="footer"><div class="container"><div class="fbar">© ۲۰۲۶ راحله اوینی‌پور — تمامی حقوق محفوظ است. | شماره پروانه روانشناسی: <span style="font-family:monospace;letter-spacing:1px;opacity:.9;">۲۸۴۶۳</span> | <a href="/privacy" style="color:#fff;text-decoration:underline;">حریم خصوصی</a></div></div></footer>
<script>lucide.createIcons();</script>
</body>
</html>`;

  fs.writeFileSync(filepath, fullArticle, 'utf8');
  log(`Article created: articles/${filename}`);

  return { filename, seoTitle, tag, excerpt, date, topicKey, mode: 'new' };
}

/**
 * Deepen the article that already covers this topic instead of publishing a rival to it.
 *
 * The rotation is `dayIndex % TOPICS.length`, so every topic comes round again every
 * 23 days. Publishing each time produced 33 near-duplicate articles competing with each
 * other for the same query — Google consolidates or demotes those, and none of them win.
 * Refreshing keeps one strong URL per topic that gets better over time, and a genuine
 * dateModified bump is a freshness signal a duplicate never was.
 */
async function refreshBlogPost(topicKey, topicFull, filename) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required');

  const filepath = path.join(BLOG_DIR, filename);
  const existing = fs.readFileSync(filepath, 'utf8');
  const currentMatch = existing.match(/<article class="blog-article">[\s\S]*?<\/article>/);
  if (!currentMatch) throw new Error(`No article body found in ${filename}`);
  const currentHtml = currentMatch[0];

  const tag = getTag(topicKey);
  const publishedIso = (existing.match(/"datePublished":\s*"([^"]+)"/) || [, toIsoDate(Date.now())])[1];
  const publishedTs = new Date(publishedIso).getTime();
  const modifiedTs = Date.now();

  // The refresh target has to scale with what is already there. A fixed
  // "900-1200 words" instruction combined with the >=90% length guard below means
  // any article that has already grown past ~1330 words can never pass its own next
  // refresh — the model is told to write shorter than the guard will accept, so the
  // run throws and the whole day fails. Articles reached 1267-1676 words on the first
  // cycle, so several were already over that line.
  const countWords = h => h.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  const currentWords = countWords(currentHtml);
  const AT_CEILING = currentWords >= 1800;   // long enough; improve instead of inflate
  const targetMin = AT_CEILING ? currentWords : Math.max(1100, currentWords + 150);
  const targetMax = AT_CEILING ? currentWords + 150 : targetMin + 350;
  const lengthRule = AT_CEILING
    ? `- این مقاله به طول مطلوب رسیده است. طول را تقریباً حفظ کن (${targetMin} تا ${targetMax} کلمه) و به‌جای افزودن حجم، دقت بالینی، کیفیت مثال‌ها و انسجام متن را بهتر کن`
    : `- طول نهایی: ${targetMin} تا ${targetMax} کلمه (باید از نسخه قبلی کامل‌تر باشد)`;

  const prompt = `تو راحله اوینی‌پور هستی — روان‌شناس فارسی‌زبان مقیم دبی، با قلمی گرم، حرفه‌ای و علمی.

این مقاله قبلاً در سایت منتشر شده است. وظیفه تو **بازنویسی و عمیق‌تر کردن** آن است — نه نوشتن یک مقاله جدید و نه تکرار همان متن.

مقاله فعلی:
${currentHtml}

قوانین بازنویسی:
- همان موضوع ("${topicFull}") را حفظ کن — این صفحه نباید موضوعش عوض شود
- عنوان (h1) را فقط در صورتی تغییر بده که واقعاً بهتر و دقیق‌تر شود؛ در غیر این صورت همان را نگه دار
- بخش‌های خوب موجود را نگه دار و **عمیق‌تر** کن
- حداقل یک بخش (h3) کاملاً تازه اضافه کن که در نسخه قبلی نبود
- مثال‌های بالینی تازه‌تر و مشخص‌تر بیاور
${lengthRule}

اجباری — استناد علمی (این سایت YMYL است و بدون منبع اعتبار ندارد):
- حداقل دو ارجاع درون‌متنی به منابع واقعی و قابل راستی‌آزمایی بیاور
  (مثلاً DSM-5، APA، WHO، NIMH، آرون بک، جفری یانگ، جان بولبی، مری اینسورث)
- در انتهای مقاله، درست قبل از </article>، این بلوک را اضافه کن:
  <div class="sources"><h3>منابع و مراجع</h3><ul><li>[منبع ۱]</li><li>[منبع ۲]</li></ul></div>
- ❌ هرگز منبع، مطالعه، آمار یا نام پژوهشگر جعلی نساز — فقط منابعی که واقعاً وجود دارند

لحن و سبک:
- گرم، انسانی و قابل اعتماد، اما حرفه‌ای و علمی — نه شاعرانه
- ❌ شعر، بیت، استعاره ادبی، یا ارجاع به حافظ/مولانا/سعدی ممنوع
- ✅ تکیه بر مفاهیم اثبات‌شده (CBT، طرحواره‌درمانی، دلبستگی)

ساختار خروجی (فقط HTML، بدون توضیح):

<!--DESCRIPTION:[توضیح متای صفحه — یک جمله کامل و جذاب فارسی، بین ۱۲۰ تا ۱۵۵ کاراکتر، بدون نقل‌قول]-->
<article class="blog-article">
<h1>[عنوان]</h1>
<div class="meta">__META__</div>
<p>[مقدمه]</p>
<h3>[عنوان بخش]</h3>
<p>[محتوا]</p>
... (۴ تا ۵ بخش)
<h3>یک قدم کوچک</h3>
<ul>
<li>[تمرین ۱]</li>
<li>[تمرین ۲]</li>
<li>[تمرین ۳]</li>
</ul>
<h3>در پایان</h3>
<p>[جمع‌بندی گرم + دعوت ملایم به رزرو جلسه]</p>
</article>

مهم: فقط و فقط HTML برگردان، بدون هیچ متن اضافی.
مهم: خط <!--DESCRIPTION:...--> اجباری است.
مهم: <div class="meta"> را دقیقاً به‌صورت __META__ بنویس — تاریخ را خودت ننویس.`;

  log(`Refreshing existing article for topic: ${topicFull} (${filename})`);

  const provider = process.env.GENERATION_PROVIDER || 'ruflo';
  const baseUrl = provider === 'anthropic'
    ? 'https://api.anthropic.com'
    : (process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic');

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 10000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error(`API Error ${response.status}: ${await response.text()}`);

  const data = await response.json();
  const textBlock = (data.content || []).find(c => c.type === 'text');
  const rawContent = textBlock ? textBlock.text : JSON.stringify((data.content || [])[0] || {});

  const articleMatch = rawContent.match(/<article class="blog-article">[\s\S]*?<\/article>/);
  if (!articleMatch) throw new Error('Failed to parse refreshed article');

  let articleHtml = articleMatch[0];

  // Never let a refresh meaningfully shrink the page — that is a downgrade, not an
  // update. At the ceiling the target is "same length, better content", so allow a
  // little more slack there than during the growth phase.
  const words = countWords;
  const floor = AT_CEILING ? 0.95 : 0.9;
  if (words(articleHtml) < currentWords * floor) {
    throw new Error(`Refresh produced a shorter article (${words(articleHtml)}w vs ${currentWords}w, floor ${Math.round(currentWords * floor)}w) — keeping the existing version`);
  }

  const seoTitle = (articleHtml.match(/<h1>(.*?)<\/h1>/) || [, topicFull])[1];
  const excerpt = extractExcerpt(rawContent, articleHtml);
  if (!excerpt) throw new Error('Could not derive a meta description for the refresh');

  articleHtml = normalizeMetaLine(articleHtml, tag, publishedTs, modifiedTs);

  // Swap the body and re-sync every field that mirrors it.
  let updated = existing.replace(currentMatch[0], articleHtml);
  updated = updated
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${attr(seoTitle)} — راحله اوینی‌پور</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(excerpt)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(seoTitle)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(excerpt)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${attr(seoTitle)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${attr(excerpt)}">`)
    .replace(/"headline":\s*"(?:[^"\\]|\\.)*"/, `"headline": ${JSON.stringify(seoTitle)}`)
    .replace(/"description":\s*"(?:[^"\\]|\\.)*"/, `"description": ${JSON.stringify(excerpt)}`)
    .replace(/"dateModified":\s*"[^"]*"/, `"dateModified": "${toIsoDate(modifiedTs)}"`);

  fs.writeFileSync(filepath, updated, 'utf8');
  log(`Article refreshed: articles/${filename} (${words(currentHtml)}w → ${words(articleHtml)}w)`);

  return {
    filename, seoTitle, tag, excerpt,
    date: toFaDate(publishedTs),
    topicKey,
    mode: 'refresh'
  };
}

async function generateImage(topicKey, seoTitle) {
  const apiKey = process.env.SEGMIND_API_KEY;
  if (!apiKey) {
    throw new Error('SEGMIND_API_KEY not set');
  }

  const basePrompt = IMAGE_PROMPTS[topicKey] || 'Peaceful therapy room with warm light and plants, soft cream tones';
  // Blend topic prompt with article title for better content match
  const fullPrompt = `${basePrompt}, mood inspired by: ${seoTitle}, warm cream and rose color palette, soft natural lighting, cinematic, high quality, 4k`;
  const negativePrompt = 'ugly, blurry, low quality, watermark, text, logo, cartoon, anime, distorted, dark, harsh lighting';

  log(`Generating image via Segmind for topic: ${topicKey}`);

  const response = await fetch('https://api.segmind.com/v1/flux-schnell', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      steps: 4,
      seed: Math.floor(Math.random() * 1000000),
      sampler: 'euler',
      scheduler: 'simple',
      width: 1216,
      height: 832,
      base64: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Segmind API error ${response.status}: ${err}`);
  }

  const timestamp = Date.now();
  const imageFilename = `${timestamp}-${getEnglishName(topicKey)}.jpg`;
  const imageFilepath = path.join(__dirname, imageFilename);

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(imageFilepath, Buffer.from(buffer));

  log(`Image saved: articles/${imageFilename}`);
  return imageFilename;
}

// The hero image already on a published article, so a refresh can keep it.
function currentArticleImage(filename) {
  try {
    const html = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8');
    const m = html.match(/<img src="\.\.\/([^"]+)"[^>]*style="width:100%;height:/);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

function updateArticleImage(filename, imageFilename) {
  const filepath = path.join(BLOG_DIR, filename);
  let content = fs.readFileSync(filepath, 'utf8');

  // Match any img tag in article-wrap (handles both ../path and https:// sources)
  const oldImageRegex = /<img src="[^"]*" alt="[^"]*" style="width:100%;height:[^"]*;object-fit:cover;object-position:center;border-radius:20px;margin-bottom:40px;"[^>]*>/;
  const newImageTag = `<img src="../${imageFilename}" alt="" style="width:100%;height:400px;object-fit:cover;object-position:center;border-radius:20px;margin-bottom:40px;">`;

  content = content.replace(oldImageRegex, newImageTag);
  fs.writeFileSync(filepath, content, 'utf8');
  log(`Updated article with new image: ${imageFilename}`);
}

function updateBlogHtml(articleInfo) {
  const blogPath = path.join(__dirname, 'blog.html');
  let blogContent = fs.readFileSync(blogPath, 'utf8');

  const articleSlug = toSlug(articleInfo.filename);

  // On a refresh the card already exists — update it in place and promote the
  // article to the featured slot rather than adding a second card for one URL.
  if (articleInfo.mode === 'refresh') {
    const cardRe = new RegExp(`<article class="bcard">(?:(?!</article>)[\\s\\S])*?/articles/${articleSlug}(?:(?!</article>)[\\s\\S])*?</article>`);
    const card = blogContent.match(cardRe);
    if (card) {
      const newCard = card[0]
        .replace(/<h3>[\s\S]*?<\/h3>/, `<h3>${articleInfo.seoTitle}</h3>`)
        .replace(/<span class="btag">[\s\S]*?<\/span>/, `<span class="btag">${articleInfo.tag}</span>`);
      blogContent = blogContent.replace(card[0], newCard);
    }
    blogContent = blogContent
      .replace(/(<a id="feat-img-link" href=")[^"]*(")/, `$1/articles/${articleSlug}$2`)
      .replace(/(<a id="feat-title-link" href=")[^"]*(")/, `$1/articles/${articleSlug}$2`)
      .replace(/(<a class="arrow-link" id="feat-arrow-link" href=")[^"]*(")/, `$1/articles/${articleSlug}$2`);
    fs.writeFileSync(blogPath, blogContent, 'utf8');
    log('Updated blog.html (refreshed card + featured slot)');
    return;
  }
  const featHtml = `<article class="feat">
      <a id="feat-img-link" href="/articles/${articleSlug}"><img src="/${articleInfo.imageFilename}" alt="${articleInfo.seoTitle}" style="width:100%;height:340px;object-fit:cover;object-position:center center;border-radius:16px;display:block;"></a>
      <div class="fbody">
        <span class="btag">${articleInfo.tag}</span>
        <h2><a id="feat-title-link" href="/articles/${articleSlug}" style="color:inherit;text-decoration:none;">${articleInfo.seoTitle}</a></h2>
        <p>${articleInfo.excerpt}</p>
        <a class="arrow-link" id="feat-arrow-link" href="/articles/${articleSlug}">ادامهٔ مطلب <i data-lucide="arrow-left"></i></a>
      </div>
    </article>`;

  const bcardHtml = `<article class="bcard"><a href="/articles/${articleSlug}"><img src="/${articleInfo.imageFilename}" alt="مقاله روانشناسی" style="width:100%;height:200px;object-fit:cover;object-position:center;border-radius:12px 12px 0 0;"></a><div class="bbody"><span class="btag">${articleInfo.tag}</span><h3>${articleInfo.seoTitle}</h3><div class="meta">${articleInfo.date} · ۵ دقیقه</div><a class="more" href="/articles/${articleSlug}">ادامهٔ مطلب ←</a></div></article>`;

  const featuredMatch = blogContent.match(/<!-- FEATURED -->\s*<article class="feat">[\s\S]*?<\/article>\s*<!-- GRID -->/);
  if (featuredMatch) {
    blogContent = blogContent.replace(featuredMatch[0], `<!-- FEATURED -->\n      ${featHtml}\n    <!-- GRID -->`);
  }
  blogContent = blogContent.replace('<div class="grid3">', `<div class="grid3">\n      ${bcardHtml}`);

  fs.writeFileSync(blogPath, blogContent, 'utf8');
  log('Updated blog.html with new article card');
}

function updateSitemap(articleInfo) {
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');

  const articleUrl = `${SITE_URL}/articles/${toSlug(articleInfo.filename)}`;
  const today = new Date().toISOString().slice(0, 10);

  // A refreshed article is already listed — bump its lastmod instead of adding a
  // second entry for the same URL.
  const existing = new RegExp(`<url><loc>${articleUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc><lastmod>[^<]*</lastmod>`);
  if (existing.test(sitemap)) {
    sitemap = sitemap.replace(existing, `<url><loc>${articleUrl}</loc><lastmod>${today}</lastmod>`);
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    log('Updated sitemap.xml (lastmod bumped)');
    return;
  }

  const newEntry = `  <url><loc>${articleUrl}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
  sitemap = sitemap.replace('</urlset>', `${newEntry}</urlset>`);
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  log('Updated sitemap.xml');
}

async function sendTelegramPhoto(articleInfo) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are required');
  }

  const articleUrl = `${SITE_URL}/articles/${toSlug(articleInfo.filename)}`;
  // Keep articleUrl CLEAN for checkDeployedUrl, sitemap, article-info.json
  // Only tag the URL that goes into the Telegram caption
  const shareUrl = withUtm(articleUrl, 'telegram', 'social', 'daily-blog');
  const imagePath = articleInfo.imageFilename.startsWith('cat-')
    ? path.join(__dirname, articleInfo.imageFilename)
    : path.join(BLOG_DIR, articleInfo.imageFilename);
  const topicEmoji = {
    'تنهایی': '🌙',
    'عشق به خود': '🌸',
    'کودک درون': '🧸',
    'ترس': '🕊️',
    'معنویت': '✨',
    'معنا': '🌅',
    'مهاجرت': '🌍',
    'عزت نفس': '💎',
    'روابط': '🤍',
    'آرامش': '🕯️'
  };

  const emoji = topicEmoji[articleInfo.tag] || '📝';

  const articleContent = fs.readFileSync(path.join(BLOG_DIR, articleInfo.filename), 'utf8');
  const paragraphs = articleContent.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
  const summaryLines = paragraphs.slice(1, 4)
    .map(p => p.replace(/<[^>]+>/g, '').trim())
    .filter(l => l.length > 30)
    .slice(0, 3)
    .map(s => s.length > 200 ? s.substring(0, 197) + '...' : s);
  const summary = summaryLines.length >= 3 ? summaryLines.join('\n') : articleInfo.excerpt;

  const caption = `${emoji} *${articleInfo.seoTitle}*

${summary}

🔗 ادامهٔ مطلب: ${shareUrl}

━━━━━━━━━━━━━━━
📅 ${articleInfo.date}
🏷️ #${articleInfo.tag}
💡 روانشناس عمومی | راحله اوینی‌پور`;

  const imageBuffer = fs.readFileSync(imagePath);
  const formData = new FormData();
  formData.append('chat_id', channelId);
  formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), articleInfo.imageFilename);
  formData.append('caption', caption);
  formData.append('parse_mode', 'Markdown');

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  const response = await fetch(telegramApiUrl, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`Telegram API error: ${result.description}`);
  }

  log('Telegram photo sent successfully');
}

async function sendTelegramAlert(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    log(`Failed to send Telegram alert: ${err.message}`, 'ERROR');
  }
}

async function checkDeployedUrl(articleUrl) {
  log(`Post-deploy check: waiting 3min for Vercel to propagate...`);
  await new Promise(resolve => setTimeout(resolve, 180000));

  try {
    const response = await fetch(articleUrl, { method: 'GET', redirect: 'follow' });
    if (response.ok) {
      log(`Post-deploy check PASSED: ${articleUrl} → ${response.status}`);
      return true;
    } else {
      log(`Post-deploy check FAILED: ${articleUrl} → ${response.status}`, 'ERROR');
      // Silent — log only, no Telegram spam
      return false;
    }
  } catch (err) {
    log(`Post-deploy check ERROR: ${err.message}`, 'ERROR');
    // Silent — log only, no Telegram spam
    return false;
  }
}

function deployToVercel() {
  log('Starting Vercel deployment...');

  try {
    execSync('npx vercel --prod --yes --token $VERCEL_TOKEN', { stdio: 'inherit' });
    log('Vercel deployment completed');
  } catch (error) {
    log('Vercel deployment failed: ' + error.message, 'ERROR');
    throw error;
  }
}

async function runDailyAutomation() {
  log('========== Daily Automation Started ==========', 'INFO');

  const startTime = Date.now();
  let success = false;
  let articleInfo = null;

  try {
    const { key: topicKey, full: topicFull } = getTodayTopic();
    log(`Selected topic: ${topicFull} (Topic #${TOPICS.indexOf(topicKey) + 1}/${TOPICS.length})`);

    // The rotation revisits every topic every TOPICS.length days. Second time round
    // we deepen the page that already ranks for it instead of publishing a rival.
    const existingArticle = findTopicArticle(topicKey);
    if (existingArticle) {
      articleInfo = await refreshBlogPost(topicKey, topicFull, existingArticle);
      log(`Article refreshed: ${articleInfo.seoTitle}`);
    } else {
      articleInfo = await generateBlogPost(topicKey, topicFull);
      log(`Article generated: ${articleInfo.seoTitle}`);
    }

    if (articleInfo.mode === 'refresh') {
      // Keep the existing hero image — a refreshed page should not churn its OG image.
      articleInfo.imageFilename = (articleInfo.filename && currentArticleImage(articleInfo.filename))
        || getCategoryImage(topicKey);
    } else {
      try {
        const imageFilename = await generateImage(topicKey, articleInfo.seoTitle);
        articleInfo.imageFilename = imageFilename;
        updateArticleImage(articleInfo.filename, imageFilename);
      } catch (imageError) {
        log(`Image generation failed, using fallback: ${imageError.message}`, 'WARN');
        articleInfo.imageFilename = getCategoryImage(topicKey);
      }
    }

    updateBlogHtml(articleInfo);
    updateSitemap(articleInfo);

    // Write article info for notify-telegram.js
    const cleanUrl = `${SITE_URL}/articles/${toSlug(articleInfo.filename)}`;
    const articleData = JSON.stringify({
      filename: articleInfo.filename,
      seoTitle: articleInfo.seoTitle,
      tag: articleInfo.tag,
      date: articleInfo.date,
      imageFilename: articleInfo.imageFilename,
      articleUrl: cleanUrl,
      shareUrl: withUtm(cleanUrl, 'telegram', 'social', 'daily-blog')
    });
    fs.writeFileSync(path.join(__dirname, '.article-info.json'), articleData, 'utf8');

    // Deploy to Vercel
    deployToVercel();

    // Post-deploy URL check (3 min wait — Vercel needs time to propagate)
    const articleUrl = `${SITE_URL}/articles/${toSlug(articleInfo.filename)}`;
    await checkDeployedUrl(articleUrl);

    success = true;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`========== Automation Completed Successfully in ${duration}s ==========`, 'INFO');

  } catch (error) {
    log(`Automation failed: ${error.message}`, 'ERROR');
    console.error(error);
  }

  return { success, articleInfo };
}

if (require.main === module) {
  runDailyAutomation()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runDailyAutomation, getTodayTopic };