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
  'اضطراب',
  'افسردگی',
  'روابط',
  'عزت نفس',
  'طرحواره درمانی',
  'OCD',
  'رشد فردی',
  'والدین',
  'ADHD',
  'ذهن‌آگاهی'
];

const TOPIC_FULL = {
  'اضطراب': 'اضطراب و راه‌های کنترل آن',
  'افسردگی': 'افسردگی و نشانه‌های اولیه',
  'روابط': 'روابط سالم و مرزهای شخصی',
  'عزت نفس': 'عزت نفس و رابطه با خود',
  'طرحواره درمانی': 'طرحواره درمانی چیست؟',
  'OCD': 'OCD - وسواس فکری عملی',
  'رشد فردی': 'رشد فردی و خودشناسی',
  'والدین': 'والدین و فرزندپروری',
  'ADHD': 'ADHD در بزرگسالان',
  'ذهن‌آگاهی': 'ذهن‌آگاهی و مدیتیشن'
};

const CATEGORY_IMAGES = {
  'اضطراب': 'cat-anxiety.png',
  'افسردگی': 'cat-depression.png',
  'روابط': 'cat-relationships.png',
  'عزت نفس': 'cat-selfawareness.png',
  'خودشناسی': 'cat-selfawareness.png',
  'طرحواره درمانی': 'cat-schema.png',
  'OCD': 'cat-ocd.png',
  'رشد فردی': 'cat-growth.png',
  'والدین': 'cat-parenting.png',
  'ADHD': 'cat-adhd.png',
  'ذهن‌آگاهی': 'cat-mindfulness.png'
};

const IMAGE_PROMPTS = {
  'اضطراب': 'Person sitting peacefully by a window with morning light, hands relaxed on lap, soft cream and rose tones, calm breathing moment, warm interior, photorealistic',
  'افسردگی': 'Warm golden light breaking through dark clouds over a peaceful landscape, hope and renewal feeling, soft rose and amber tones, cinematic',
  'روابط': 'Two women having warm conversation over coffee, genuine connection, soft natural light, cream and rose tones, cozy cafe setting, photorealistic',
  'عزت نفس': 'Woman standing at sunrise looking at horizon, empowered confident posture, golden morning light, open landscape, warm tones, cinematic',
  'طرحواره درمانی': 'Open journal with pen and dried flowers on wooden desk, soft window light, cream and rose aesthetic, mindful journaling moment, lifestyle photography',
  'OCD': 'Minimal clean organized desk with single plant and candle, perfectly calm space, soft natural light, cream tones, zen atmosphere',
  'والدین': 'Parent and child walking hand in hand in soft afternoon light, warm golden tones, gentle connection, park setting, lifestyle photography',
  'ADHD': 'Creative colorful workspace with plants and natural light, energetic yet organized, warm tones, productive atmosphere, lifestyle photography',
  'رشد فردی': 'Woman standing at sunrise looking at horizon, empowered confident posture, golden morning light, open landscape, warm tones, cinematic',
  'ذهن‌آگاهی': 'Candle flame with dried flowers and tea cup on white surface, zen minimal setup, soft diffused light, cream and rose tones, lifestyle photography'
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
    'اضطراب': 'اضطراب',
    'افسردگی': 'افسردگی',
    'روابط': 'روابط',
    'عزت نفس': 'عزت نفس',
    'طرحواره درمانی': 'طرحواره',
    'OCD': 'OCD',
    'رشد فردی': 'رشد فردی',
    'والدین': 'والدین',
    'ADHD': 'ADHD',
    'ذهن‌آگاهی': 'ذهن‌آگاهی'
  };
  return map[topicKey] || 'روانشناسی';
}

const TOPIC_ENGLISH = {
  'اضطراب': 'anxiety',
  'افسردگی': 'depression',
  'روابط': 'relationships',
  'عزت نفس': 'self-esteem',
  'طرحواره درمانی': 'schema-therapy',
  'OCD': 'ocd',
  'رشد فردی': 'personal-growth',
  'والدین': 'parenting',
  'ADHD': 'adhd',
  'ذهن‌آگاهی': 'mindfulness'
};

function getEnglishName(topicKey) {
  return TOPIC_ENGLISH[topicKey] || 'article';
}

function getCategoryImage(topicKey) {
  return CATEGORY_IMAGES[topicKey] || 'cat-growth.png';
}

function getPersianDate() {
  return new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function slugify(text) {
  return text.replace(/[^آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی\s]/g, '')
    .trim().replace(/\s+/g, '-').substring(0, 50);
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
  const prompt = `یک مقاله وبلاگی کامل و حرفه‌ای به زبان فارسی معیار درباره "${topicFull}" بنویس.

قوانین سخت:
- دقیقاً ۶۰۰ تا ۸۰۰ کلمه
- ۱ عنوان SEO جذاب (بین ۵۰-۶۰ کاراکتر)
- ۱ پاراگراف مقدمه (۳-۴ جمله)
- ۳ تا ۴ بخش با عنوان‌های مرتب (h3)
- هر بخش ۲-۳ پاراگراف
- ۱ بخش "نکات عملی" با ۳ توصیه مشخص
- ۱ نتیجه‌گیری با CTA برای رزرو جسله
- لحن: آرام، تخصصی، دوستانه
- برچسب: ${tag}

ساختار خروجی (فقط HTML، بدون توضیح):

<article class="generated-post">
<h1>[عنوان SEO]</h1>
<div class="meta">[برچسب] · [تاریخ فارسی] · [مدت زمان: X دقیقه]</div>
<p>[مقدمه]</p>
<h3>[عنوان بخش ۱]</h3>
<p>[محتوا]</p>
<h3>[عنوان بخش ۲]</h3>
<p>[محتوا]</p>
<h3>[عنوان بخش ۳]</h3>
<p>[محتوا]</p>
<h3>نکات عملی</h3>
<ul>
<li>[نکته ۱]</li>
<li>[نکته ۲]</li>
<li>[نکته ۳]</li>
</ul>
<h3>نتیجه‌گیری</h3>
<p>[جمع‌بندی + CTA]</p>
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
  const articleMatch = rawContent.match(/<article class="generated-post">[\s\S]*?<\/article>/);
  if (!articleMatch) throw new Error('Failed to parse generated article');

  const articleHtml = articleMatch[0];
  const titleMatch = articleHtml.match(/<h1>(.*?)<\/h1>/);
  const seoTitle = titleMatch ? titleMatch[1] : topicFull;
  const date = getPersianDate();
  const excerpt = extractExcerpt(articleHtml);
  const categoryImage = getCategoryImage(topicKey);

  const timestamp = Date.now();
  const filename = `${timestamp}-${getEnglishName(topicKey)}.html`;
  const filepath = path.join(BLOG_DIR, filename);

  const fullArticle = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${seoTitle} — راحله اوینی‌پور</title>
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
<img src="../${categoryImage}" alt="${seoTitle}" style="width:100%;height:320px;object-fit:cover;object-position:center;border-radius:20px;margin-bottom:40px;">
${articleHtml}
<div style="background:linear-gradient(135deg,#F4E9E2,#FBF5F0);border-radius:20px;padding:40px;text-align:center;margin:48px 0;">
  <p style="font-family:'Markazi Text',serif;font-size:28px;color:#3B2E2A;margin-bottom:8px;">آماده‌اید قدم بعدی را بردارید؟</p>
  <p style="color:#806B63;margin-bottom:24px;font-size:15px;">جلسه اول رایگان — از طریق Zoom، WhatsApp یا Google Meet</p>
  <a href="/booking.html" style="display:block;background:#9C6A60;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:600;text-align:center;margin-bottom:10px;">رزرو جلسه رایگان</a>
  <a href="https://wa.me/989124228995" target="_blank" style="display:block;background:#25D366;color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:600;text-align:center;">واتساپ</a>
</div>
</main>

<footer class="footer"><div class="container"><div class="fbar">© ۲۰۲۵ راحله اوینی‌پور — تمامی حقوق محفوظ است.</div></div></footer>
<script>lucide.createIcons();</script>
</body>
</html>`;

  fs.writeFileSync(filepath, fullArticle, 'utf8');
  log(`Article created: articles/${filename}`);

  return { filename, seoTitle, tag, excerpt, date, topicKey };
}

async function generateImage(topicKey, seoTitle) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const imagePrompt = IMAGE_PROMPTS[topicKey];
  if (!imagePrompt) {
    log(`No image prompt for topic: ${topicKey}, using fallback`, 'WARN');
    return getCategoryImage(topicKey);
  }

  log(`Generating image for topic: ${topicKey}`);

  // Use direct MiniMax API (not the anthropic proxy path)
  const baseUrl = 'https://api.minimax.io';

  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'image-01',
      prompt: imagePrompt,
      number: 1,
      size: '1024x1024'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Image API Error ${response.status}: ${err}`);
  }

  const data = await response.json();

  if (!data.data || !data.data[0] || !data.data[0].url) {
    throw new Error('No image URL in API response');
  }

  const imageUrl = data.data[0].url;
  const timestamp = Date.now();
  const imageFilename = `${timestamp}-${getEnglishName(topicKey)}.png`;
  const imageFilepath = path.join(BLOG_DIR, imageFilename);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const buffer = await imageResponse.arrayBuffer();
  fs.writeFileSync(imageFilepath, Buffer.from(buffer));

  log(`Image saved: articles/${imageFilename}`);
  return imageFilename;
}

function updateArticleImage(filename, imageFilename) {
  const filepath = path.join(BLOG_DIR, filename);
  let content = fs.readFileSync(filepath, 'utf8');

  const oldImageRegex = /<img src="\.\.\/[^"]+" alt="[^"]*" style="width:100%;height:320px;object-fit:cover;object-position:center;border-radius:20px;margin-bottom:40px;">/;
  const newImageTag = `<img src="../${imageFilename}" alt="" style="width:100%;height:400px;object-fit:cover;object-position:center;border-radius:20px;margin-bottom:40px;">`;

  content = content.replace(oldImageRegex, newImageTag);
  fs.writeFileSync(filepath, content, 'utf8');
  log(`Updated article with new image: ${imageFilename}`);
}

function updateBlogHtml(articleInfo) {
  const blogPath = path.join(__dirname, 'blog.html');
  let blogContent = fs.readFileSync(blogPath, 'utf8');

  const featHtml = `<article class="feat">
      <a id="feat-img-link" href="/articles/${articleInfo.filename}"><img src="../articles/${articleInfo.imageFilename}" alt="${articleInfo.seoTitle}" style="width:100%;height:340px;object-fit:cover;object-position:center center;border-radius:16px;display:block;"></a>
      <div class="fbody">
        <span class="btag">${articleInfo.tag}</span>
        <h2><a id="feat-title-link" href="/articles/${articleInfo.filename}" style="color:inherit;text-decoration:none;">${articleInfo.seoTitle}</a></h2>
        <p>${articleInfo.excerpt}</p>
        <a class="arrow-link" id="feat-arrow-link" href="/articles/${articleInfo.filename}">ادامهٔ مطلب <i data-lucide="arrow-left"></i></a>
      </div>
    </article>`;

  const bcardHtml = `<article class="bcard"><a href="/articles/${articleInfo.filename}"><img src="../articles/${articleInfo.imageFilename}" alt="مقاله روانشناسی" style="width:100%;height:200px;object-fit:cover;object-position:center;border-radius:12px 12px 0 0;"></a><div class="bbody"><span class="btag">${articleInfo.tag}</span><h3>${articleInfo.seoTitle}</h3><div class="meta">${articleInfo.date} · ۵ دقیقه</div><a class="more" href="/articles/${articleInfo.filename}">ادامهٔ مطلب ←</a></div></article>`;

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
    'اضطراب': '😰',
    'افسردگی': '😔',
    'روابط': '💝',
    'عزت نفس': '✨',
    'طرحواره': '🧠',
    'OCD': '🔄',
    'رشد فردی': '🌱',
    'والدین': '👨‍👩‍👧',
    'ADHD': '🎯',
    'ذهن‌آگاهی': '🧘'
  };

  const emoji = topicEmoji[articleInfo.tag] || '📝';

  const articleContent = fs.readFileSync(path.join(BLOG_DIR, articleInfo.filename), 'utf8');
  const paragraphs = articleContent.match(/<p[^>]*>(.{50,250})<\/p>/g) || [];
  const summaryLines = paragraphs.slice(1, 4).map(p => p.replace(/<[^>]+>/g, '').trim()).filter(l => l.length > 20);
  const summary = summaryLines.length >= 3 ? summaryLines.slice(0, 3).join('\n') : articleInfo.excerpt;

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

    deployToVercel();

    await new Promise(resolve => setTimeout(resolve, 30000));

    await sendTelegramPhoto(articleInfo);

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