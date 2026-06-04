/**
 * notify-telegram.js
 * Polls until article is live, then sends Telegram post.
 * Run after Vercel deploy in the GitHub Actions workflow.
 */

const fs = require('fs');
const path = require('path');

const ARTICLE_INFO_PATH = path.join(__dirname, '.article-info.json');
const MAX_ATTEMPTS = 48;
const POLL_INTERVAL_MS = 5000;

function readArticleInfo() {
  if (!fs.existsSync(ARTICLE_INFO_PATH)) {
    console.error('.article-info.json not found');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(ARTICLE_INFO_PATH, 'utf8'));
}

async function pollUntilLive(url) {
  console.log(`Polling ${url}`);
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`Article live after ${i} attempts`);
        return true;
      }
      console.log(`Attempt ${i}: HTTP ${res.status} - retrying in 5s...`);
    } catch (e) {
      console.log(`Attempt ${i}: ${e.message} - retrying in 5s...`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.error(`Article never came up after ${MAX_ATTEMPTS} attempts`);
  return false;
}

function extractSummary(html) {
  const ps = html.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
  return ps
    .slice(1, 4)
    .map(p => p.replace(/<[^>]+>/g, '').trim())
    .filter(l => l.length > 30)
    .slice(0, 3)
    .map(s => s.length > 200 ? s.substring(0, 197) + '...' : s)
    .join('\n');
}

function htmlEscape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TOPIC_EMOJI = {
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

async function main() {
  const info = readArticleInfo();
  const { filename, seoTitle, tag, date, imageFilename, articleUrl } = info;

  const live = await pollUntilLive(articleUrl);
  if (!live) process.exit(1);

  const localArticlePath = path.join(__dirname, 'articles', filename);
  const articleHtml = fs.readFileSync(localArticlePath, 'utf8');
  const summary = extractSummary(articleHtml);
  if (!summary) console.warn('Warning: summary extraction returned empty');
  const emoji = TOPIC_EMOJI[tag] || '📝';

  const safeTitle = htmlEscape(seoTitle);
  const safeSummary = htmlEscape(summary);

  const caption = `${emoji} <b>${safeTitle}</b>

${safeSummary}

🔗 <a href="${articleUrl}">ادامهٔ مطلب</a>

━━━━━━━━━━━━━━━
📅 ${date}
🏷️ #${tag}
💡 روانشناس عمومی | راحله اوینی‌پور`;

  const imagePath = imageFilename.startsWith('cat-')
    ? path.join(__dirname, imageFilename)
    : path.join(__dirname, 'articles', imageFilename);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!botToken || !channelId) {
    console.error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are required');
    process.exit(1);
  }

  const formData = new FormData();
  formData.append('chat_id', channelId);
  if (!fs.existsSync(imagePath)) { console.error('Image not found: ' + imagePath); process.exit(1); }
  const imageBuffer = fs.readFileSync(imagePath);
  formData.append('photo', new Blob([imageBuffer]), imageFilename);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData
  });
  const result = await res.json();
  console.log('Telegram response:', JSON.stringify(result));

  if (!result.ok) {
    console.error('Telegram API error:', result.description);
    process.exit(1);
  }

  console.log('Telegram sent successfully');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});