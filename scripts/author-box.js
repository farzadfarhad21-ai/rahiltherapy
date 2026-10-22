// "About the author" block shown under every article (E-E-A-T for YMYL content).
//
// Lives OUTSIDE <article> on purpose: refreshBlogPost() swaps only the <article>
// element, so anything placed after </article> survives every daily refresh.
// Styles are inline because styles.css is served with an immutable cache header —
// new classes there would not reach returning visitors.
//
// Usage:
//   node scripts/author-box.js        → add/refresh the box in every articles/*.html
//   require('./scripts/author-box')   → { AUTHOR_BOX_HTML, applyAuthorBox }

const fs = require('fs');
const path = require('path');

const START = '<!-- author-box:start -->';
const END = '<!-- author-box:end -->';

const AUTHOR_BOX_HTML = `${START}
<aside aria-label="درباره نویسنده" style="display:flex;gap:18px;align-items:flex-start;background:#FBF5F0;border:1px solid #E8D0C7;border-radius:18px;padding:22px 24px;margin:40px 0 28px;">
  <img src="/profile.webp" alt="راحله اوینی‌پور، روانشناس عمومی" width="72" height="72" loading="lazy" decoding="async" style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex:none;">
  <div style="min-width:0;">
    <p style="margin:0 0 2px;font-size:13px;color:#806B63;">درباره نویسنده</p>
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#3B2E2A;"><a href="/about" style="color:#3B2E2A;text-decoration:none;">راحله اوینی‌پور</a> — روانشناس عمومی</p>
    <p style="margin:0 0 10px;font-size:15px;line-height:1.9;color:#3a3230;">کارشناسی ارشد روانشناسی عمومی (گرایش بالینی)، درمانگر دارای گواهی CBT و طرحواره‌درمانی، با بیش از ۱۵ سال تجربه و بیش از ۳۰۰۰ ساعت جلسهٔ درمانی. جلسات ویژهٔ بانوان فارسی‌زبان، حضوری در دبی و آنلاین در سراسر دنیا.</p>
    <p style="margin:0 0 10px;font-size:14px;"><a href="/about" style="color:#9C6A60;font-weight:600;">بیشتر دربارهٔ راحله</a> · <a href="/booking" style="color:#9C6A60;font-weight:600;">رزرو جلسهٔ اول رایگان</a></p>
    <p style="margin:0;font-size:12.5px;line-height:1.8;color:#806B63;">این مقاله جنبهٔ آموزشی دارد و جایگزین تشخیص یا درمان تخصصی نیست. اگر در بحران هستید، با اورژانس محلی تماس بگیرید.</p>
  </div>
</aside>
${END}`;

const AUTHOR_ID = 'https://rahiltherapy.com/about#therapist';

function applyAuthorBox(html) {
  let out = html;
  const existing = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (existing.test(out)) {
    out = out.replace(existing, AUTHOR_BOX_HTML);
  } else {
    const lastArticle = out.lastIndexOf('</article>');
    if (lastArticle !== -1) {
      const at = lastArticle + '</article>'.length;
      out = out.slice(0, at) + '\n' + AUTHOR_BOX_HTML + out.slice(at);
    } else {
      const anchor = ['<!-- Internal links', '</main>', '<footer'].find(a => out.includes(a));
      if (!anchor) throw new Error('no insertion point for author box');
      out = out.replace(anchor, AUTHOR_BOX_HTML + '\n' + anchor);
    }
  }
  // Tie the Article's author to the one Person entity defined on the site.
  out = out.replace(/("author"\s*:\s*\{\s*"@type"\s*:\s*"Person",)(?!\s*"@id")/g,
    `$1\n    "@id": "${AUTHOR_ID}",`);
  return out;
}

module.exports = { AUTHOR_BOX_HTML, applyAuthorBox };

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'articles');
  let changed = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const p = path.join(dir, f);
    const before = fs.readFileSync(p, 'utf8');
    const after = applyAuthorBox(before);
    if (after !== before) { fs.writeFileSync(p, after, 'utf8'); changed++; }
  }
  console.log(`author box applied to ${changed} article(s)`);
}
