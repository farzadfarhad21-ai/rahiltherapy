#!/usr/bin/env python3
"""Generate Raheleh's cloned voice from a Persian script using ElevenLabs v3.

The v3 model supports inline emotion/style tags directly in the text:
  [thoughtful], [sad], [happy], [whisper], [calm], [strong], [warm],
  [excited], [serious], [gentle], [hopeful]

These tags shape delivery — use sparingly (2-4 per script max) for natural flow.

Usage:
  python3 generate_audio.py scripts/day-01.txt audio/day-01.mp3
  python3 generate_audio.py - audio/test.mp3 < /dev/stdin   # pipe text
"""
import os, sys, pathlib, urllib.request, urllib.error, json

ENV = pathlib.Path(__file__).parent / '.env'
if ENV.exists():
    for line in ENV.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

API_KEY = os.environ['ELEVENLABS_API_KEY']
VOICE_ID = os.environ['ELEVENLABS_VOICE_ID']
MODEL = os.environ.get('ELEVENLABS_MODEL_ID', 'eleven_v3')

def synth(text: str, out_path: pathlib.Path,
          stability: float = 0.40,
          similarity: float = 0.80,
          style: float = 0.20,
          speaker_boost: bool = True) -> None:
    """Call ElevenLabs TTS, write MP3 to out_path.

    Tuning notes (for v3 + emotion tags):
      stability  0.30-0.45 = expressive, follows emotion tags well (recommended)
                 0.50+     = more monotone, ignores subtle tags
      similarity 0.75-0.85 = stays close to cloned voice
      style      0.15-0.30 = adds natural variation without going wild
    """
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}'
    body = {
        'text': text,
        'model_id': MODEL,
        'voice_settings': {
            'stability': stability,
            'similarity_boost': similarity,
            'style': style,
            'use_speaker_boost': speaker_boost,
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode('utf-8'),
        headers={
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            audio = resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='replace')
        raise SystemExit(f'ElevenLabs API {e.code}: {err_body}')

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(audio)
    print(f'✓ {out_path} ({len(audio)//1024} KB, {len(text)} chars)')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: generate_audio.py <script.txt|-> <out.mp3>')
    script_arg, out_arg = sys.argv[1], sys.argv[2]
    text = sys.stdin.read() if script_arg == '-' else pathlib.Path(script_arg).read_text(encoding='utf-8')
    synth(text.strip(), pathlib.Path(out_arg))
