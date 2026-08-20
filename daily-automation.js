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

// Retargeted 2026-07-15 for ranking: kept 10 sound clinical topics, dropped 2
// pseudoscience (NLP, ضمیر ناخودآگاه — E-E-A-T risk on a licensed-psychologist YMYL
// site) + 8 generic/saturated self-help. Added 5 diaspora (Raheleh's USP) + 8 specific
// long-tail. Excludes queries already covered by manual depth-/foundations-/authority-
// articles (ERP-OCD, thought-record, schema-therapy, online-therapy-diaspora) to avoid
// keyword cannibalization.
const TOPICS = [
  // — kept clinical (sound, on-brand) —
  'خشم و کنترل خشم',
  'نشخوار فکری',
  'راه‌های افزایش عزت نفس',
  'راه‌های افزایش اعتماد به نفس',
  'خود پنداره',
  'خطاهای شناختی',
  'دلبستگی ایمن',
  'هوش هیجانی',
  'مکانیزم‌های دفاعی',
  'تاب‌آوری',
  // — added: diaspora / migration (USP, competitors are not Dubai-based) —
  'غم غربت',
  'بحران هویت در مهاجرت',
  'شوک فرهنگی',
  'تنهایی در غربت',
  'فرزندپروری دوفرهنگی',
  // — added: specific long-tail (winnable, like the ERP article at position #10) —
  'فرق CBT و طرحواره‌درمانی',
  'دلبستگی اجتنابی',
  'دلبستگی اضطرابی',
  'اضطراب اجتماعی',
  'تکنیک صندلی خالی',
  'ذهن‌آگاهی مبتنی بر شناخت',
  'کمال‌گرایی',
  'مرزهای سالم در روابط'
];

const TOPIC_FULL = {
  'خشم و کنترل خشم': 'خشم و کنترل خشم؛ راه‌های علمی برای آرام کردن آتش درون',
  'نشخوار فکری': 'نشخوار فکری؛ چرخه افکار تکراری و راه خروج از آن',
  'راه‌های افزایش عزت نفس': 'راه‌های افزایش عزت نفس؛ تمرین‌های روزانه برای ارزشمندی واقعی',
  'راه‌های افزایش اعتماد به نفس': 'راه‌های افزایش اعتماد به نفس؛ از باور درونی تا عمل بیرونی',
  'خود پنداره': 'خود پنداره؛ تصویری که از خود داریم چگونه ساخته می‌شود',
  'خطاهای شناختی': 'خطاهای شناختی؛ تله‌های ذهنی که ما را اسیر می‌کنند',
  'دلبستگی ایمن': 'دلبستگی ایمن؛ ریشه‌های روابط سالم و عمیق',
  'هوش هیجانی': 'هوش هیجانی؛ کلید موفقیت در روابط و زندگی',
  'مکانیزم‌های دفاعی': 'مکانیزم‌های دفاعی روان؛ سپرهای ناخودآگاه ذهن',
  'تاب‌آوری': 'تاب‌آوری؛ هنر برخاستن دوباره از سختی‌ها',
  'غم غربت': 'غم غربت؛ چرا دلتنگی وطن گاهی به افسردگی تبدیل می‌شود',
  'بحران هویت در مهاجرت': 'بحران هویت در مهاجرت؛ وقتی نمی‌دانی به کجا تعلق داری',
  'شوک فرهنگی': 'شوک فرهنگی؛ چهار مرحله‌ای که هر مهاجری تجربه می‌کند',
  'تنهایی در غربت': 'تنهایی در غربت؛ چگونه در کشوری تازه دوباره احساس تعلق کنیم',
  'فرزندپروری دوفرهنگی': 'فرزندپروری دوفرهنگی؛ بزرگ کردن کودک میان دو فرهنگ',
  'فرق CBT و طرحواره‌درمانی': 'فرق CBT و طرحواره‌درمانی؛ کدام روش برای شما مناسب‌تر است',
  'دلبستگی اجتنابی': 'دلبستگی اجتنابی؛ چرا از نزدیکی عاطفی فرار می‌کنیم',
  'دلبستگی اضطرابی': 'دلبستگی اضطرابی؛ ترس از طرد شدن در روابط',
  'اضطراب اجتماعی': 'اضطراب اجتماعی و درمان شناختی-رفتاری؛ رهایی از ترس قضاوت',
  'تکنیک صندلی خالی': 'تکنیک صندلی خالی؛ گفت‌وگو با خویشتن برای التیام زخم‌های کهنه',
  'ذهن‌آگاهی مبتنی بر شناخت': 'ذهن‌آگاهی مبتنی بر شناخت (MBCT)؛ پیشگیری از بازگشت افسردگی',
  'کمال‌گرایی': 'کمال‌گرایی؛ وقتی «به‌اندازه کافی خوب» هرگز کافی نیست',
  'مرزهای سالم در روابط': 'مرزهای سالم در روابط؛ چگونه «نه» گفتن را یاد بگیریم'
};

const CATEGORY_IMAGES = {
  'خشم و کنترل خشم': 'cat-anxiety.jpg',
  'نشخوار فکری': 'cat-anxiety.jpg',
  'راه‌های افزایش عزت نفس': 'cat-selfawareness.jpg',
  'راه‌های افزایش اعتماد به نفس': 'cat-selfawareness.jpg',
  'خود پنداره': 'cat-selfawareness.jpg',
  'خطاهای شناختی': 'cat-anxiety.jpg',
  'دلبستگی ایمن': 'cat-relationships.jpg',
  'هوش هیجانی': 'cat-relationships.jpg',
  'مکانیزم‌های دفاعی': 'cat-anxiety.jpg',
  'تاب‌آوری': 'cat-growth.jpg',
  'غم غربت': 'cat-depression.jpg',
  'بحران هویت در مهاجرت': 'cat-selfawareness.jpg',
  'شوک فرهنگی': 'cat-growth.jpg',
  'تنهایی در غربت': 'cat-depression.jpg',
  'فرزندپروری دوفرهنگی': 'cat-parenting.jpg',
  'فرق CBT و طرحواره‌درمانی': 'cat-schema.jpg',
  'دلبستگی اجتنابی': 'cat-relationships.jpg',
  'دلبستگی اضطرابی': 'cat-relationships.jpg',
  'اضطراب اجتماعی': 'cat-anxiety.jpg',
  'تکنیک صندلی خالی': 'cat-mindfulness.jpg',
  'ذهن‌آگاهی مبتنی بر شناخت': 'cat-mindfulness.jpg',
  'کمال‌گرایی': 'cat-selfawareness.jpg',
  'مرزهای سالم در روابط': 'cat-relationships.jpg'
};

const IMAGE_PROMPTS = {
  'خشم و کنترل خشم': 'Person taking deep calming breath with closed eyes in quiet room, releasing tension, soft natural window light, cream tones, intimate lifestyle photography',
  'نشخوار فکری': 'Person staring out night window with reflective expression, looping thoughts as soft swirling light, warm interior, intimate mood, cinematic',
  'راه‌های افزایش عزت نفس': 'Woman writing positive affirmations in journal at sunny desk, gentle confidence, soft morning light, cream and rose tones, lifestyle',
  'راه‌های افزایش اعتماد به نفس': 'Woman walking confidently down sunlit street with relaxed shoulders, golden hour light, warm cream tones, cinematic photography',
  'خود پنداره': 'Soft layered reflections of woman in gentle mirrors exploring self-image, warm cream and rose tones, artistic conceptual portrait',
  'خطاهای شناختی': 'Tangled threads being slowly untangled by gentle hands on wooden table, symbolizing mental clarity, soft natural light, cream tones',
  'دلبستگی ایمن': 'Mother and adult daughter holding hands in soft afternoon light, deep emotional bond, warm cream and rose tones, intimate portrait',
  'هوش هیجانی': 'Two people in deep empathetic conversation in warm cafe, genuine emotional connection, soft focus, cream and rose tones, photorealistic',
  'مکانیزم‌های دفاعی': 'Person slowly lowering invisible shield revealing vulnerability, soft warm light, cream and amber tones, conceptual portrait',
  'تاب‌آوری': 'Single delicate flower growing through cracked stone in soft morning light, resilience, warm cream and rose tones, photorealistic',
  'غم غربت': 'Person looking out apartment window at unfamiliar city skyline with wistful longing for home, warm cream and amber tones, cinematic, photorealistic',
  'بحران هویت در مهاجرت': 'Person standing between two overlapping cultural worlds, contemplative, soft double-exposure effect, warm cream and rose tones, conceptual portrait, photorealistic',
  'شوک فرهنگی': 'Traveler with suitcase in busy foreign street feeling overwhelmed yet hopeful, soft golden hour light, warm cream tones, cinematic photography',
  'تنهایی در غربت': 'Person sitting alone by window in cozy apartment abroad with warm tea, quiet solitude turning to peace, soft evening light, cream and amber tones, intimate',
  'فرزندپروری دوفرهنگی': 'Parent and child reading together with books in two languages, warm loving bond, soft natural light, cream and rose tones, lifestyle photography',
  'فرق CBT و طرحواره‌درمانی': 'Two gentle paths diverging in soft morning light symbolizing therapy choices, calm and clarity, warm cream and rose tones, conceptual, photorealistic',
  'دلبستگی اجتنابی': 'Two people in a relationship, one gently reaching while the other keeps soft emotional distance, warm light, cream and rose tones, conceptual portrait',
  'دلبستگی اضطرابی': 'Person anxiously waiting by phone in soft light, longing for reassurance in a relationship, warm cream tones, intimate cinematic portrait',
  'اضطراب اجتماعی': 'Person taking a calm breath before entering a social gathering, gentle courage, soft warm light, cream and rose tones, photorealistic lifestyle',
  'تکنیک صندلی خالی': 'Two empty chairs facing each other in a warm therapy room with soft window light, symbolic dialogue, cream and amber tones, calm photorealistic interior',
  'ذهن‌آگاهی مبتنی بر شناخت': 'Person sitting mindfully aware of thoughts passing like clouds, serene, soft morning light, cream and rose tones, peaceful photorealistic',
  'کمال‌گرایی': 'Person gently setting down a heavy weight of impossible standards, relief and self-compassion, soft warm light, cream tones, conceptual portrait',
  'مرزهای سالم در روابط': 'Person calmly and kindly saying no with an open-palm gesture, healthy boundary, warm confident light, cream and rose tones, lifestyle photography'
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
    'خشم و کنترل خشم': 'خشم',
    'نشخوار فکری': 'نشخوار فکری',
    'راه‌های افزایش عزت نفس': 'عزت نفس',
    'راه‌های افزایش اعتماد به نفس': 'اعتماد به نفس',
    'خود پنداره': 'خود پنداره',
    'خطاهای شناختی': 'خطاهای شناختی',
    'دلبستگی ایمن': 'دلبستگی',
    'هوش هیجانی': 'هوش هیجانی',
    'مکانیزم‌های دفاعی': 'مکانیزم دفاعی',
    'تاب‌آوری': 'تاب‌آوری',
    'غم غربت': 'مهاجرت',
    'بحران هویت در مهاجرت': 'مهاجرت',
    'شوک فرهنگی': 'مهاجرت',
    'تنهایی در غربت': 'مهاجرت',
    'فرزندپروری دوفرهنگی': 'مهاجرت',
    'فرق CBT و طرحواره‌درمانی': 'طرحواره',
    'دلبستگی اجتنابی': 'دلبستگی',
    'دلبستگی اضطرابی': 'دلبستگی',
    'اضطراب اجتماعی': 'اضطراب',
    'تکنیک صندلی خالی': 'روان‌درمانی',
    'ذهن‌آگاهی مبتنی بر شناخت': 'ذهن‌آگاهی',
    'کمال‌گرایی': 'کمال‌گرایی',
    'مرزهای سالم در روابط': 'روابط'
  };
  return map[topicKey] || 'روانشناسی';
}

const TOPIC_ENGLISH = {
  'خشم و کنترل خشم': 'anger-management',
  'نشخوار فکری': 'rumination',
  'راه‌های افزایش عزت نفس': 'self-esteem-boost',
  'راه‌های افزایش اعتماد به نفس': 'self-confidence',
  'خود پنداره': 'self-concept',
  'خطاهای شناختی': 'cognitive-distortions',
  'دلبستگی ایمن': 'secure-attachment',
  'هوش هیجانی': 'emotional-intelligence',
  'مکانیزم‌های دفاعی': 'defense-mechanisms',
  'تاب‌آوری': 'resilience',
  'غم غربت': 'homesickness',
  'بحران هویت در مهاجرت': 'migration-identity',
  'شوک فرهنگی': 'culture-shock',
  'تنهایی در غربت': 'loneliness-abroad',
  'فرزندپروری دوفرهنگی': 'bicultural-parenting',
  'فرق CBT و طرحواره‌درمانی': 'cbt-vs-schema',
  'دلبستگی اجتنابی': 'avoidant-attachment',
  'دلبستگی اضطرابی': 'anxious-attachment',
  'اضطراب اجتماعی': 'social-anxiety-cbt',
  'تکنیک صندلی خالی': 'empty-chair',
  'ذهن‌آگاهی مبتنی بر شناخت': 'mbct',
  'کمال‌گرایی': 'perfectionism',
  'مرزهای سالم در روابط': 'healthy-boundaries'
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

<footer class="footer"><div class="container"><div class="fbar">© ۲۰۲۶ راحله اوینی‌پور — تمامی حقوق محفوظ است. | <a href="/privacy" style="color:#fff;text-decoration:underline;">حریم خصوصی</a></div></div></footer>
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
- اگر مرجع علمی مرتبط داری (DSM-5, APA, WHO, بک، یانگ، بولبی) اشاره کن
- طول نهایی: ۹۰۰ تا ۱۲۰۰ کلمه (باید از نسخه قبلی بلندتر و کامل‌تر باشد)

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

  // Never let a refresh shrink the page — that would be a downgrade, not an update.
  const words = h => h.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  if (words(articleHtml) < words(currentHtml) * 0.9) {
    throw new Error(`Refresh produced a shorter article (${words(articleHtml)}w vs ${words(currentHtml)}w) — keeping the existing version`);
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