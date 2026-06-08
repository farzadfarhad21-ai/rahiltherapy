const fs = require('fs');
const path = require('path');

const dir = '/Users/farzaden/Downloads/ruflow-project/raheleh_project/articles/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let processed = 0;
let errors = 0;

for (const file of files) {
  try {
    const fullPath = path.join(dir, file);
    let html = fs.readFileSync(fullPath, 'utf8');

    // Extract h1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (!h1Match) {
      console.log(`SKIP ${file}: no h1 found`);
      continue;
    }
    const ogTitle = h1Match[1].trim();

    // Extract first paragraph text (strip tags)
    const pMatch = html.match(/<p[^>]*>([^<]{20,})<\/p>/);
    if (!pMatch) {
      console.log(`SKIP ${file}: no paragraph found`);
      continue;
    }
    let metaDesc = pMatch[1].replace(/<[^>]+>/g, '').trim();
    if (metaDesc.length > 160) {
      metaDesc = metaDesc.substring(0, 157) + '...';
    }

    // Extract article image src
    const imgMatch = html.match(/<img[^>]+src="([^"]+\.png)"[^>]*>/);
    if (!imgMatch) {
      console.log(`SKIP ${file}: no image found`);
      continue;
    }
    const ogImage = 'https://rahiltherapy.com/' + imgMatch[1].replace(/^\.\.\//, '');

    // Canonical
    const canonical = 'https://rahiltherapy.com/articles/' + file.replace('.html', '');

    // Check if already has meta tags (don't double-add)
    if (html.includes('og:title')) {
      console.log(`SKIP ${file}: already has OG tags`);
      continue;
    }

    // Build SEO tags block
    const seoBlock = `
<!-- SEO Meta Tags -->
<meta name="description" content="${metaDesc}">
<link rel="canonical" href="${canonical}">

<!-- Open Graph -->
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${metaDesc}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:site_name" content="راحله اوینی‌پور — روانشناس عمومی">
<meta property="og:locale" content="fa_IR">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${metaDesc}">
<meta name="twitter:image" content="${ogImage}">
`;

    // Insert after the last </script> tag or before </head>
    const insertAfter = html.match(/<\/script>\n/);
    if (insertAfter) {
      const pos = html.indexOf('</script>\n', html.lastIndexOf('</script>\n')) + '</script>\n'.length;
      html = html.slice(0, pos) + seoBlock + html.slice(pos);
    } else {
      // Fallback: insert before </head>
      html = html.replace('</head>', seoBlock + '</head>');
    }

    fs.writeFileSync(fullPath, html, 'utf8');
    console.log(`OK ${file}: ${ogTitle.substring(0, 40)}...`);
    processed++;
  } catch (e) {
    console.log(`ERROR ${file}: ${e.message}`);
    errors++;
  }
}

console.log(`\nDone: ${processed} processed, ${errors} errors`);