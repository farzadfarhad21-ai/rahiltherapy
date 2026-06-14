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

const TOPICS = [
  'تنهایی و خلوت',
  'عشق به خود',
  'کودک درون',
  'ترس و رهایی',
  'توکل و معنویت',
  'معنا و هدف زندگی',
  'روان‌شناسی مهاجرت',
  'عزت نفس و ارزشمندی',
  'روابط و دلبستگی',
  'آرامش در جهان ناپایدار'
];

const TOPIC_FULL = {
  'تنهایی و خلوت': 'تنهایی؛ فرار از خود یا بازگشت به خود؟',
  'عشق به خود': 'عشق به خود؛ نه خودشیفتگی، بلکه مهربانی با خویشتن',
  'کودک درون': 'کودک درون؛ زخم‌هایی که بزرگ شدیم اما فراموش نکردیم',
  'ترس و رهایی': 'ترس چیست و چگونه می‌توانیم آزاد شویم؟',
  'توکل و معنویت': 'توکل؛ رها کردن کنترل و اعتماد به زندگی',
  'معنا و هدف زندگی': 'چرا صبح بیدار می‌شوی؟ جستجوی معنا در زندگی روزمره',
  'روان‌شناسی مهاجرت': 'روان‌شناسی مهاجرت؛ چالش‌های هویت، تعلق و سازگاری در سرزمین تازه',
  'عزت نفس و ارزشمندی': 'عزت نفس واقعی چیست و از کجا می‌آید؟',
  'روابط و دلبستگی': 'چرا در روابط آسیب می‌بینیم؟ الگوهای دلبستگی و تأثیر آن‌ها',
  'آرامش در جهان ناپایدار': 'چگونه در دنیایی پر از تغییر، آرامش درونی داشته باشیم؟'
};

const CATEGORY_IMAGES = {
  'تنهایی و خلوت': 'cat-mindfulness.jpg',
  'عشق به خود': 'cat-selfawareness.jpg',
  'کودک درون': 'cat-growth.jpg',
  'ترس و رهایی': 'cat-anxiety.jpg',
  'توکل و معنویت': 'cat-mindfulness.jpg',
  'معنا و هدف زندگی': 'cat-growth.jpg',
  'روان‌شناسی مهاجرت': 'cat-relationships.jpg',
  'عزت نفس و ارزشمندی': 'cat-selfawareness.jpg',
  'روابط و دلبستگی': 'cat-relationships.jpg',
  'آرامش در جهان ناپایدار': 'cat-mindfulness.jpg'
};

const IMAGE_PROMPTS = {
  'تنهایی و خلوت': 'Woman sitting alone by a window in quiet morning light, peaceful solitude, soft cream and rose tones, tea cup in hand, reflective mood, warm interior, photorealistic',
  'عشق به خود': 'Woman with eyes closed, gentle smile, hand on heart, soft golden light, self-compassion moment, cream and rose tones, intimate portrait, cinematic',
  'کودک درون': 'Soft vintage photograph of a child\'s toy on wooden floor with warm afternoon light, nostalgic and gentle, cream and amber tones, emotional depth, lifestyle photography',
  'ترس و رهایی': 'Person opening their hands releasing light, standing at edge of cliff overlooking misty valley, freedom and release, golden sunrise, cinematic wide shot',
  'توکل و معنویت': 'Hands clasped in prayer near window with soft morning light streaming in, dried flowers nearby, spiritual calm, cream and rose tones, intimate lifestyle photography',
  'معنا و هدف زندگی': 'Woman writing in journal at sunrise on a rooftop, city lights fading, first light of day, purposeful and contemplative, warm golden tones, cinematic',
  'روان‌شناسی مهاجرت': 'Woman looking out airport window with thoughtful expression, soft natural light, suitcase nearby, warm cream and rose tones, reflective mood, cinematic, photorealistic',
  'عزت نفس و ارزشمندی': 'Woman standing tall in soft morning light, confident yet gentle posture, looking into mirror with warmth, cream and rose tones, empowerment portrait',
  'روابط و دلبستگی': 'Two people sitting close in warm café light, genuine emotional connection, soft focus, cream and rose tones, authentic human moment, photorealistic',
  'آرامش در جهان ناپایدار': 'Single candle flame in a dark room, small circle of warm light, stillness and peace, cream and amber tones, zen minimal, meditative atmosphere'
};

const LOG_FILE = path.join(__dirname, 'logs', 'automation.log');
const BLOG_DIR = path.join(__dirname, 'articles');
const SITE_URL = 'https://rahiltherapy.com';

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
    'تنهایی و خلوت': 'تنهایی',
    'عشق به خود': 'عشق به خود',
    'کودک درون': 'کودک درون',
    'ترس و رهایی': 'ترس',
    'توکل و معنویت': 'معنویت',
    'معنا و هدف زندگی': 'معنا',
    'روان‌شناسی مهاجرت': 'مهاجرت',
    'عزت نفس و ارزشمندی': 'عزت نفس',
    'روابط و دلبستگی': 'روابط',
    'آرامش در جهان ناپایدار': 'آرامش'
  };
  return map[topicKey] || 'روانشناسی';
}

const TOPIC_ENGLISH = {
  'تنهایی و خلوت': 'solitude',
  'عشق به خود': 'self-love',
  'کودک درون': 'inner-child',
  'ترس و رهایی': 'fear-liberation',
  'توکل و معنویت': 'spirituality',
  'معنا و هدف زندگی': 'meaning-life',
  'روان‌شناسی مهاجرت': 'migration-psychology',
  'عزت نفس و ارزشمندی': 'self-worth',
  'روابط و دلبستگی': 'human-connection',
  'آرامش در جهان ناپایدار': 'peace-impermanence'
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

function extractExcerpt(html) {
  const pMatch = html.match(/<p[^>]*>(.{50,150})<\/p>/);
  return pMatch ? pMatch[1].replace(/<[^>]+>/g, '') : '';
}

async function generateBlogPost(topicKey, topicFull) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const tag = getTag(topicKey);
  const prompt = `تو راحله اوینی‌پور هستی — روان‌شناس فارسی‌زبان مقیم دبی، با قلمی گرم، حرفه‌ای و علمی.
یک مقاله وبلاگی درباره "${topicFull}" بنویس.

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

<article class="blog-article">
<h1>[عنوان]</h1>
<div class="meta">[برچسب] · <time datetime="[تاریخ ISO YYYY-MM-DD]">[تاریخ فارسی]</time> · [مدت زمان: X دقیقه]</div>
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

مهم: فقط و فقط HTML برگردان، بدون هیچ متن اضافی.`;

  log(`Generating article for topic: ${topicFull}`);

  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
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

  const articleHtml = articleMatch[0];
  const titleMatch = articleHtml.match(/<h1>(.*?)<\/h1>/);
  const seoTitle = titleMatch ? titleMatch[1] : topicFull;
  const date = getPersianDate();
  const excerpt = extractExcerpt(articleHtml);
  const categoryImage = getCategoryImage(topicKey);
  const imagePrompt = IMAGE_PROMPTS[topicKey] || 'Peaceful therapy room with warm light and plants, soft cream tones, calming atmosphere';
  const articleImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=630&nologo=true&seed=${Date.now()}`;

  const timestamp = Date.now();
  const filename = `${timestamp}-${getEnglishName(topicKey)}.html`;
  const filepath = path.join(BLOG_DIR, filename);

  const fullArticle = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${seoTitle} — راحله اوینی‌پور</title>
<meta name="description" content="${excerpt}">
<link rel="canonical" href="https://rahiltherapy.com/articles/${filename}">
<meta property="og:title" content="${seoTitle}">
<meta property="og:description" content="${excerpt}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://rahiltherapy.com/articles/${filename}">
<meta property="og:image" content="https://rahiltherapy.com/${getCategoryImage(topicKey)}">
<meta property="og:locale" content="fa_IR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${seoTitle}">
<meta name="twitter:description" content="${excerpt}">

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
  "datePublished": "${new Date(timestamp).toISOString().split('T')[0]}",
  "dateModified": "${new Date(timestamp).toISOString().split('T')[0]}",
  "inLanguage": "fa",
  "articleSection": ${JSON.stringify(tag)},
  "mainEntityOfPage": "https://rahiltherapy.com/articles/${filename}"
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
    {"@type": "ListItem", "position": 3, "name": ${JSON.stringify(tag)}, "item": "https://rahiltherapy.com/articles/${filename}"}
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
    <a class="logo" href="/index.html"><span class="mk"></span>راحله اوینی‌پور</a>
    <nav class="navlinks">
      <a href="/services.html">خدمات</a>
      <a href="/about.html">درباره من</a>
      <a href="/blog.html" class="active">مقالات</a>
      <a href="/contact.html">تماس</a>
    </nav>
    <div class="navcta">
      <a class="btn btn-fill" href="/booking.html">رزرو جلسه</a>
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
  <a href="/booking.html" style="display:block;background:#9C6A60;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:600;text-align:center;margin-bottom:10px;">رزرو جلسه رایگان</a>
  <a href="https://wa.me/989124228995" target="_blank" style="display:block;background:#25D366;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:600;text-align:center;">واتساپ</a>
</div>
</main>

<footer class="footer"><div class="container"><div class="fbar">© ۲۰۲۶ راحله اوینی‌پور — تمامی حقوق محفوظ است. | شماره پروانه روانشناسی: <span style="font-family:monospace;letter-spacing:1px;opacity:.9;">۲۸۴۶۳</span> | <a href="/privacy" style="color:#fff;text-decoration:underline;">حریم خصوصی</a></div></div></footer>
<script>lucide.createIcons();</script>
</body>
</html>`;

  fs.writeFileSync(filepath, fullArticle, 'utf8');
  log(`Article created: articles/${filename}`);

  return { filename, seoTitle, tag, excerpt, date, topicKey };
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

  const featHtml = `<article class="feat">
      <a id="feat-img-link" href="/articles/${articleInfo.filename}"><img src="/${articleInfo.imageFilename}" alt="${articleInfo.seoTitle}" style="width:100%;height:340px;object-fit:cover;object-position:center center;border-radius:16px;display:block;"></a>
      <div class="fbody">
        <span class="btag">${articleInfo.tag}</span>
        <h2><a id="feat-title-link" href="/articles/${articleInfo.filename}" style="color:inherit;text-decoration:none;">${articleInfo.seoTitle}</a></h2>
        <p>${articleInfo.excerpt}</p>
        <a class="arrow-link" id="feat-arrow-link" href="/articles/${articleInfo.filename}">ادامهٔ مطلب <i data-lucide="arrow-left"></i></a>
      </div>
    </article>`;

  const bcardHtml = `<article class="bcard"><a href="/articles/${articleInfo.filename}"><img src="/${articleInfo.imageFilename}" alt="مقاله روانشناسی" style="width:100%;height:200px;object-fit:cover;object-position:center;border-radius:12px 12px 0 0;"></a><div class="bbody"><span class="btag">${articleInfo.tag}</span><h3>${articleInfo.seoTitle}</h3><div class="meta">${articleInfo.date} · ۵ دقیقه</div><a class="more" href="/articles/${articleInfo.filename}">ادامهٔ مطلب ←</a></div></article>`;

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

  const articleUrl = `${SITE_URL}/articles/${articleInfo.filename}`;
  const newEntry = `  <url><loc>${articleUrl}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;

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

  const articleUrl = `${SITE_URL}/articles/${articleInfo.filename}`;
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

🔗 [ادامهٔ مطلب](${articleUrl})

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
    const response = await fetch(articleUrl, { method: 'HEAD' });
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
    log(`Selected topic: ${topicFull} (Topic #${TOPICS.indexOf(topicKey) + 1}/10)`);

    articleInfo = await generateBlogPost(topicKey, topicFull);
    log(`Article generated: ${articleInfo.seoTitle}`);

    try {
      const imageFilename = await generateImage(topicKey, articleInfo.seoTitle);
      articleInfo.imageFilename = imageFilename;
      updateArticleImage(articleInfo.filename, imageFilename);
    } catch (imageError) {
      log(`Image generation failed, using fallback: ${imageError.message}`, 'WARN');
      articleInfo.imageFilename = getCategoryImage(topicKey);
    }

    updateBlogHtml(articleInfo);
    updateSitemap(articleInfo);

    // Write article info for notify-telegram.js
    const articleData = JSON.stringify({
      filename: articleInfo.filename,
      seoTitle: articleInfo.seoTitle,
      tag: articleInfo.tag,
      date: articleInfo.date,
      imageFilename: articleInfo.imageFilename,
      articleUrl: `${SITE_URL}/articles/${articleInfo.filename}`
    });
    fs.writeFileSync(path.join(__dirname, '.article-info.json'), articleData, 'utf8');

    // Deploy to Vercel
    deployToVercel();

    // Post-deploy URL check (3 min wait — Vercel needs time to propagate)
    const articleUrl = `${SITE_URL}/articles/${articleInfo.filename}`;
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