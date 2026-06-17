# Instagram Pipeline — Raheleh Voice Clone

Generates Instagram Reels using Raheleh's cloned voice (ElevenLabs v3) + portrait photo + auto-burned Persian captions.

## Setup (already done)

- ElevenLabs voice ID: `LQDRYfGTz4CUQoOmhSYJ` (rahiltherapy 1)
- Model: `eleven_v3` (supports emotion tags)
- API key in `.env`
- ffmpeg + Pillow + arabic-reshaper + python-bidi installed
- Portrait photo: `../profile.jpg` (900x1200)

## Daily workflow

### 1. Write a script

Drop a new `.txt` file in `scripts/` — use `[emotion]` tags inline for delivery control:

```
[warm] سلام عزیزانم.
[thoughtful] وقتی پدرت می‌گه «دیگه فایده‌ای ندارم»، توقف کن.
[gentle] این یه درد نیست — یه سؤاله.
[hopeful] و این سؤال، پاسخ داره.
```

**Available emotion tags (v3):**
`[warm] [calm] [thoughtful] [sad] [happy] [hopeful] [strong] [gentle] [whisper] [excited] [serious]`

Use 2-4 tags per script max. Each Reel: aim for 60-120 words = ~40-60 sec.

### 2. Generate

```bash
python3 generate.py scripts/day-02-pain.txt
```

This:
1. Calls ElevenLabs v3 → `audio/day-02-pain.mp3`
2. Composes 1080x1920 video with Ken Burns photo zoom + Persian captions
3. Saves to `output/day-02-pain.mp4`

Audio is cached — re-running only re-composes the video (free) unless you pass `--force`.

### 3. Preview

```bash
open output/day-02-pain.mp4
```

### 4. Post to Instagram

- **Manual:** AirDrop to phone → upload as Reel
- **Buffer / Later:** Upload .mp4 + paste caption from `../instagram-parents-week.md`

## File layout

```
instagram-pipeline/
  .env                  # API keys (gitignored)
  generate.py           # End-to-end orchestrator
  generate_audio.py     # Just the voice step
  compose_video.py      # Just the video step
  scripts/              # Persian scripts with v3 emotion tags
  audio/                # Generated MP3s (gitignored)
  output/               # Final Reels (gitignored)
```

## Tuning the voice

In `generate_audio.py`, edit the `synth()` defaults:

| Parameter | Range | Effect |
|---|---|---|
| `stability` | 0.30-0.45 | Lower = more expressive, follows tags better |
| `similarity` | 0.75-0.85 | How close to cloned voice |
| `style` | 0.15-0.30 | Natural variation |

For dramatic/emotional scripts: stability 0.35, style 0.25
For calm/educational: stability 0.45, style 0.15

## Tuning the captions

In `compose_video.py`:
- `CAPTION_Y = 1240` — vertical position (lower = closer to bottom)
- `font.size = 60` — auto-shrinks if text is too long
- `ROSE / CREAM / INK` — brand colors (BGR)

## Cost per Reel

- ElevenLabs v3: ~500-700 chars per script ≈ 600 credits
- $22/mo Creator tier = 100,000 credits/month ≈ **150+ Reels/month**
- Video composition: free (local ffmpeg)

## Troubleshooting

**Voice sounds wrong:** check Voice ID in `.env`, try `stability=0.40` and re-run
**Captions cut off:** lower `CAPTION_Y` to give more room, or break script into shorter chunks
**Video too long/short:** ElevenLabs decides pacing — add more `[pause]` tags or split into 2 Reels

## Next ideas (not built yet)

- `batch.py` — generate N days in one run
- Auto-thumbnail with quote pulled from script
- Buffer API integration for one-click scheduling
- YouTube long-form variant (16:9 instead of 9:16)
