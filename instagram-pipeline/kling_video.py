#!/usr/bin/env python3
"""Generate AI video clips via Kling AI (text-to-video) for use as B-roll scenes.

Kling uses JWT auth (Access Key + Secret Key from .env). Generation is async:
submit → poll task → download MP4 when ready. Each generation takes 2-8 min.

Usage:
  python3 kling_video.py "calm elderly hands gently holding tea cup, warm light" output/scene1.mp4
  python3 kling_video.py --aspect 9:16 --duration 5 "..." out.mp4

Costs: each 5-sec generation = ~50 Kling credits ($0.5-1 depending on plan).
"""
import os, sys, time, json, pathlib, urllib.request, urllib.error, argparse
import jwt

ENV = pathlib.Path(__file__).parent / '.env'
if ENV.exists():
    for line in ENV.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

ACCESS_KEY = os.environ['KLING_ACCESS_KEY']
SECRET_KEY = os.environ['KLING_SECRET_KEY']
API_BASE = os.environ.get('KLING_API_BASE', 'https://api-singapore.klingai.com')

def make_token() -> str:
    now = int(time.time())
    payload = {'iss': ACCESS_KEY, 'exp': now + 1800, 'nbf': now - 5}
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256',
                      headers={'alg': 'HS256', 'typ': 'JWT'})

def api(method: str, path: str, body: dict | None = None, retries: int = 3) -> dict:
    url = f'{API_BASE}{path}'
    data = json.dumps(body).encode() if body else None
    last_err = None
    for attempt in range(retries):
        headers = {'Authorization': f'Bearer {make_token()}', 'Content-Type': 'application/json'}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8', errors='replace')
            sys.exit(f'Kling API {e.code} on {path}: {err}')
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = e
            print(f'  ⚠ network error (try {attempt+1}/{retries}): {e}')
            time.sleep(3 * (attempt + 1))
    sys.exit(f'Kling API unreachable after {retries} retries: {last_err}')

def text_to_video(prompt: str, aspect: str = '9:16',
                  duration: int = 5, model: str = 'kling-v1') -> str:
    """Submit a t2v job, return task_id."""
    body = {
        'model_name': model,
        'prompt': prompt,
        'negative_prompt': 'blurry, low quality, distorted, watermark, text overlay, ugly',
        'cfg_scale': 0.5,
        'mode': 'std',
        'aspect_ratio': aspect,
        'duration': str(duration),
    }
    resp = api('POST', '/v1/videos/text2video', body)
    if resp.get('code') != 0:
        sys.exit(f'Kling submit failed: {resp}')
    return resp['data']['task_id']

def wait_for(task_id: str, kind: str = 'text2video', poll_every: int = 15) -> str:
    """Poll until done, return the video URL."""
    print(f'  Task {task_id} — polling every {poll_every}s...')
    elapsed = 0
    while True:
        resp = api('GET', f'/v1/videos/{kind}/{task_id}')
        status = resp.get('data', {}).get('task_status', 'unknown')
        if status == 'succeed':
            videos = resp['data']['task_result']['videos']
            return videos[0]['url']
        if status == 'failed':
            sys.exit(f'Kling task failed: {resp}')
        print(f'  ...{status} ({elapsed}s)')
        time.sleep(poll_every)
        elapsed += poll_every
        if elapsed > 600:
            sys.exit('Kling timed out after 10 min')

def download(url: str, out_path: pathlib.Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r:
        out_path.write_bytes(r.read())
    print(f'✓ {out_path} ({out_path.stat().st_size//1024} KB)')

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('prompt')
    p.add_argument('out')
    p.add_argument('--aspect', default='9:16')
    p.add_argument('--duration', type=int, default=5)
    p.add_argument('--model', default='kling-v1')
    args = p.parse_args()
    print(f'→ Submitting Kling t2v: "{args.prompt[:60]}..."')
    task_id = text_to_video(args.prompt, args.aspect, args.duration, args.model)
    url = wait_for(task_id)
    download(url, pathlib.Path(args.out))
