/**
 * API Route: /api/generate-blog
 * Vercel Cron - runs blog-generator.js daily at 8am
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY - Anthropic API key
 *   TELEGRAM_BOT_TOKEN - Telegram bot token
 *   TELEGRAM_CHANNEL_ID - Telegram channel ID
 *
 * To set in Vercel dashboard:
 *   1. Go to https://vercel.com/dashboard → project → Settings → Environment Variables
 *   2. Add: ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
 *   3. Save and redeploy
 */

const TOPICS = [
  'اضطراب و راه‌های کنترل آن',
  'افسردگی و نشانه‌های اولیه',
  'روابط سالم و مرزهای شخصی',
  'عزت نفس و رابطه با خود',
  'طرحواره درمانی چیست؟',
  'OCD - وسواس فکری عملی',
  'رشد فردی و خودشناسی',
  'والدین و فرزندپروری',
  'ADHD در بزرگسالان',
  'ذهن‌آگاهی و مدیتیشن'
];

const TAGS = {
  'اضطراب': 'اضطراب',
  'افسردگی': 'افسردگی',
  'روابط': 'روابط',
  'عزت نفس': 'عزت نفس',
  'طرحواره': 'طرحواره',
  'OCD': 'OCD',
  'رشد': 'رشد فردی',
  'والدین': 'والدین',
  'ADHD': 'ADHD',
  'ذهن‌آگاهی': 'ذهن‌آگاهی'
};

const CATEGORY_IMAGES = {
  'اضطراب': 'cat-anxiety.png',
  'افسردگی': 'cat-depression.png',
  'روابط': 'cat-relationships.png',
  'رشد فردی': 'cat-growth.png',
  'طرحواره': 'cat-schema.png',
  'OCD': 'cat-ocd.png',
  'والدین': 'cat-parenting.png',
  'ADHD': 'cat-adhd.png',
  'خودشناسی': 'cat-selfawareness.png',
  'ذهن‌آگاهی': 'cat-mindfulness.png'
};

function getCategoryImage(tag) {
  for (const [key, img] of Object.entries(CATEGORY_IMAGES)) {
    if (tag.includes(key)) return img;
  }
  return 'cat-growth.png';
}

function getTag(topic) {
  for (const [key, tag] of Object.entries(TAGS)) {
    if (topic.includes(key)) return tag;
  }
  return 'روانشناسی';
}

function getPersianDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return now.toLocaleDateString('fa-IR', options);
}

function slugify(text) {
  return text.replace(/[^آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

function extractExcerpt(html) {
  const pMatch = html.match(/<p[^>]*>(.{50,150})<\/p>/);
  return pMatch ? pMatch[1].replace(/<[^>]+>/g, '') : '';
}

async function generateBlogPost(topic) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const prompt = `یک مقاله وبلاگی کامل و حرفه‌ای به زبان فارسی معیار درباره "${topic}" بنویس.

قوانین سخت:
- دقیقاً ۶۰۰ تا ۸۰۰ کلمه
- ۱ عنوان SEO جذاب (بین ۵۰-۶۰ کاراکتر)
- ۱ پاراگراف مقدمه (۳-۴ جمله)
- ۳ تا ۴ بخش با عنوان‌های مرتب (h3)
- هر بخش ۲-۳ پاراگراف
- ۱ بخش "نکات عملی" با ۳ توصیه مشخص
- ۱ نتیجه‌گیری با CTA برای رزرو جلسه
- لحن: آرام، تخصصی، دوستانه
- برچسب: ${getTag(topic)}

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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export default async function handler(req, res) {
  // Only allow cron requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rotate through topics based on day
    const dayIndex = Math.floor(Date.now() / 86400000) % TOPICS.length;
    const topic = TOPICS[dayIndex];

    console.log(`Generating blog post for topic: ${topic}`);

    const rawContent = await generateBlogPost(topic);

    // Parse the generated HTML
    const articleMatch = rawContent.match(/<article class="generated-post">[\s\S]*?<\/article>/);
    if (!articleMatch) {
      throw new Error('Failed to parse generated article');
    }

    const articleHtml = articleMatch[0];

    // Extract parts
    const titleMatch = articleHtml.match(/<h1>(.*?)<\/h1>/);
    const seoTitle = titleMatch ? titleMatch[1] : topic;
    const tag = getTag(topic);
    const date = getPersianDate();
    const excerpt = extractExcerpt(articleHtml);
    const topicIndex = TOPICS.indexOf(topic) + 1;
    const filename = `${Date.now()}-article-${topicIndex}.html`;
    const categoryImage = getCategoryImage(tag);

    // Full article HTML (matching blog-generator.js template)
    const fullArticle = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${seoTitle} — راحله اوینی‌پور</title>
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

    // Write to articles directory
    const fs = require('fs');
    const path = require('path');
    const filepath = path.join(process.cwd(), 'articles', filename);
    fs.writeFileSync(filepath, fullArticle, 'utf8');

    // Update blog.html - prepend new card to featured section
    const blogPath = path.join(process.cwd(), 'blog.html');
    let blogContent = fs.readFileSync(blogPath, 'utf8');

    const featHtml = `<article class="feat">
      <a id="feat-img-link" href="/articles/${filename}"><img src="${categoryImage}" alt="${seoTitle}" style="width:100%;height:340px;object-fit:cover;object-position:center center;border-radius:16px;display:block;"></a>
      <div class="fbody">
        <span class="btag">${tag}</span>
        <h2><a id="feat-title-link" href="/articles/${filename}" style="color:inherit;text-decoration:none;">${seoTitle}</a></h2>
        <p>${excerpt}</p>
        <a class="arrow-link" id="feat-arrow-link" href="/articles/${filename}">ادامهٔ مطلب <i data-lucide="arrow-left"></i></a>
      </div>
    </article>`;

    const bcardHtml = `<article class="bcard"><a href="/articles/${filename}"><img src="${categoryImage}" alt="مقاله روانشناسی" style="width:100%;height:200px;object-fit:cover;object-position:center;border-radius:12px 12px 0 0;"></a><div class="bbody"><span class="btag">${tag}</span><h3>${seoTitle}</h3><div class="meta">${date} · ۵ دقیقه</div><a class="more" href="/articles/${filename}">ادامهٔ مطلب ←</a></div></article>`;

    const featuredMatch = blogContent.match(/<!-- FEATURED -->\s*<article class="feat">[\s\S]*?<\/article>\s*<!-- GRID -->/);
    if (featuredMatch) {
      blogContent = blogContent.replace(featuredMatch[0], `<!-- FEATURED -->\n      ${featHtml}\n    <!-- GRID -->`);
    }

    blogContent = blogContent.replace('<div class="grid3">', `<div class="grid3">\n      ${bcardHtml}`);
    fs.writeFileSync(blogPath, blogContent, 'utf8');

    console.log(`Created: articles/${filename}`);

    // Send to Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    const siteUrl = 'https://rahiltherapy.com';

    if (botToken && channelId) {
      try {
        const articleUrl = `${siteUrl}/articles/${filename}`;
        const topicEmoji = {
          'اضطراب': '😰', 'افسردگی': '😔', 'روابط': '💝', 'عزت نفس': '✨',
          'طرحواره': '🧠', 'OCD': '🔄', 'رشد': '🌱', 'والدین': '👨‍👩‍👧',
          'ADHD': '🎯', 'ذهن‌آگاهی': '🧘'
        };
        const emoji = topicEmoji[tag] || '📝';

        const articleContent = fs.readFileSync(filepath, 'utf8');
        const paragraphs = articleContent.match(/<p[^>]*>(.{50,250})<\/p>/g) || [];
        const summaryLines = paragraphs.slice(1, 4).map(p => p.replace(/<[^>]+>/g, '').trim()).filter(l => l.length > 20);
        const summary = summaryLines.length >= 3 ? summaryLines.slice(0, 3).join('\n') : excerpt;

        const caption = `${emoji} *${seoTitle}*

${summary}

🔗 ادامهٔ مطلب: ${articleUrl}

━━━━━━━━━━━━━━━
📅 ${date}
🏷️ #${tag}
💡 روانشناس عمومی | راحله اوینی‌پور`;

        const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            text: caption,
            parse_mode: 'Markdown'
          })
        });
        const telegramResult = await telegramRes.json();
        console.log(`Telegram sent: ${telegramResult.ok ? 'OK' : telegramResult.description}`);
      } catch (telegramError) {
        console.error('Telegram error:', telegramError.message);
      }
    } else {
      console.log('Telegram: BOT_TOKEN or CHANNEL_ID not set, skipping');
    }

    return res.status(200).json({
      success: true,
      filename,
      seoTitle,
      tag,
      url: `/articles/${filename}`
    });

  } catch (error) {
    console.error('Error generating blog post:', error);
    return res.status(500).json({ error: error.message });
  }
}