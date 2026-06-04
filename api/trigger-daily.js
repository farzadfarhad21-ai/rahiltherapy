/**
 * API Route: /api/trigger-daily
 * Vercel Cron - triggers GitHub Actions workflow dispatch
 *
 * Environment variables required:
 *   CRON_SECRET           - secret to auth incoming cron requests
 *   GH_DISPATCH_TOKEN     - GitHub personal access token with repo workflow trigger
 *
 * Schedule (in vercel.json):
 *   { "path": "/api/trigger-daily", "schedule": "0 8 * * *" }
 */

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_DISPATCH_TOKEN not configured' });
  }

  const url = 'https://api.github.com/repos/farzadfarhad21-ai/rahiltherapy/actions/workflows/daily-blog.yml/dispatches';

  let status;
  let body;

  const cleanToken = (process.env.GH_DISPATCH_TOKEN || '').trim();
  console.log('TOKEN DIAG:', cleanToken ? (cleanToken.length + ' chars, prefix=' + cleanToken.slice(0,11)) : 'MISSING');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'rahiltherapy-cron',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    status = response.status;
    body = await response.text();
    console.log('GitHub dispatch result:', status, body);

    if (status === 204) {
      return res.status(200).json({ ok: true, triggered: true });
    }

    return res.status(500).json({ ok: false, status, body });
  } catch (err) {
    return res.status(500).json({ ok: false, status: 0, body: err.message });
  }
};