const fs = require('fs');
const path = require('path');

const dir = '/Users/farzaden/Downloads/ruflow-project/raheleh_project/articles/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

// Topic mapping: which topics link to which
const topicMap = {
  anxiety: ['depression', 'mindfulness', 'self-esteem'],
  depression: ['anxiety', 'mindfulness', 'relationships'],
  mindfulness: ['anxiety', 'depression', 'self-esteem'],
  'self-esteem': ['relationships', 'anxiety', 'mindfulness'],
  'schema-therapy': ['relationships', 'depression', 'self-esteem'],
  ocd: ['anxiety', 'depression', 'self-esteem'],
  adhd: ['anxiety', 'depression', 'self-esteem'],
  relationships: ['schema-therapy', 'self-esteem', 'mindfulness'],
  parenting: ['self-esteem', 'relationships', 'mindfulness'],
  'inner-child': ['schema-therapy', 'self-esteem', 'relationships'],
};

const topicKeywords = {
  anxiety: ['anxiety', 'اضطراب'],
  depression: ['depression', 'افسردگی'],
  mindfulness: ['mindfulness', 'ذهن‌آگاهی', 'مدیتیشن'],
  'self-esteem': ['self-esteem', 'عزت نفس'],
  'schema-therapy': ['schema', 'طرحواره'],
  ocd: ['ocd', 'وسواس'],
  adhd: ['adhd', 'بزرگسالان'],
  relationships: ['relationships', 'روابط', 'مرزهای شخصی'],
  parenting: ['parenting', 'فرزندپروری', 'والدین'],
  'inner-child': ['inner-child', 'کودک درون'],
};

function detectTopic(filename, title) {
  const lower = (filename + ' ' + title).toLowerCase();
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return topic;
    }
  }
  return null;
}

function getArticleTitle(filename) {
  const fullPath = path.join(dir, filename);
  const html = fs.readFileSync(fullPath, 'utf8');
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return m ? m[1].trim() : filename;
}

function getRelatedArticles(topic, currentFile, allFiles) {
  if (!topic) return [];
  const related = topicMap[topic] || [];
  const result = [];

  for (const f of allFiles) {
    if (f === currentFile) continue;
    const fTopic = detectTopic(f, '');
    if (fTopic && related.includes(fTopic) && result.length < 3) {
      result.push({ file: f, topic: fTopic });
    }
  }
  return result;
}

function buildRelatedSection(articles) {
  if (!articles.length) return '';
  const links = articles.map(a => {
    const title = getArticleTitle(a.file);
    return `<li><a href="/articles/${a.file}">${title}</a></li>`;
  }).join('');
  return `
<!-- Related Articles -->
<div style="margin-top:48px;padding-top:32px;border-top:1px solid var(--line);">
  <h3 style="font-size:22px;margin:0 0 18px;color:var(--ink);">مقالات مرتبط</h3>
  <ul style="font-size:15px;line-height:2.2;color:var(--muted);padding-right:20px;margin:0;">
    ${links}
  </ul>
</div>`;
}

let processed = 0;
let skipped = 0;

for (const file of files) {
  const fullPath = path.join(dir, file);
  let html = fs.readFileSync(fullPath, 'utf8');

  if (html.includes('مقالات مرتبط')) {
    skipped++;
    continue;
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : '';
  const topic = detectTopic(file, title);

  const related = getRelatedArticles(topic, file, files);
  if (!related.length) {
    const any = files.filter(f => f !== file).slice(0, 3).map(f => ({ file: f, topic: '' }));
    related.push(...any);
  }

  const section = buildRelatedSection(related);
  if (!section) {
    skipped++;
    continue;
  }

  html = html.replace('</main>', section + '\n</main>');
  fs.writeFileSync(fullPath, html, 'utf8');
  processed++;
}

console.log(`Done: ${processed} articles updated, ${skipped} skipped`);