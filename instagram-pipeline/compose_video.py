#!/usr/bin/env python3
"""Compose an Instagram Reel: portrait photo + Raheleh's audio + burned-in Persian captions.

Strategy: render each caption as a transparent PNG (Persian shaping via arabic-reshaper
+ python-bidi, Tahoma font), then composite over a Ken-Burns-zoomed photo with ffmpeg.
This works on any ffmpeg build — no libass required.

Usage:
  python3 compose_video.py <script.txt> <audio.mp3> <out.mp4> [--photo path/to.jpg]

Defaults photo to ../profile.jpg.
"""
import argparse, re, subprocess, pathlib, json, sys, shutil
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = pathlib.Path(__file__).parent
PROJECT = ROOT.parent
DEFAULT_PHOTO = PROJECT / 'profile.jpg'
FONT_PATH = '/System/Library/Fonts/Supplemental/Tahoma Bold.ttf'

W, H = 1080, 1920
CAPTION_W, CAPTION_H = 960, 340
CAPTION_Y = 1240
ROSE = (138, 87, 79)      # site --rose-2
CREAM = (251, 245, 240)
INK = (59, 46, 42)

def audio_duration(audio_path: pathlib.Path) -> float:
    out = subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'json', str(audio_path)
    ])
    return float(json.loads(out)['format']['duration'])

def clean_script(text: str) -> list[str]:
    """Strip emotion tags, split into caption chunks (max ~70 chars each)."""
    no_tags = re.sub(r'\[[^\]]+\]', '', text)
    raw = re.split(r'(?<=[.!؟\n])\s+', no_tags)
    chunks = []
    for line in raw:
        line = line.strip().rstrip('.')
        if not line:
            continue
        if len(line) > 70:
            mid = line[:70].rfind('،')
            if mid < 20:
                mid = line[:70].rfind(' ')
            if mid > 20:
                chunks.append(line[:mid].strip().rstrip('،'))
                chunks.append(line[mid+1:].strip())
                continue
        chunks.append(line)
    return chunks

def shape_persian(text: str) -> str:
    """Reshape Persian/Arabic glyphs for PIL rendering."""
    return get_display(arabic_reshaper.reshape(text))

def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    """Word-wrap shaped Persian text to fit max_w pixels."""
    # Wrap on ORIGINAL text (word-aware), then shape each line
    words = text.split()
    lines = []
    current = ''
    for w in words:
        trial = (current + ' ' + w).strip()
        shaped = shape_persian(trial)
        if font.getlength(shaped) <= max_w:
            current = trial
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return [shape_persian(l) for l in lines]

def render_caption(text: str, out_png: pathlib.Path) -> None:
    """Render one caption as a 960x340 transparent PNG with brand-styled card."""
    img = Image.new('RGBA', (CAPTION_W, CAPTION_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded card background (cream with rose border accent)
    card = Image.new('RGBA', (CAPTION_W, CAPTION_H), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle((0, 0, CAPTION_W, CAPTION_H), radius=36,
                            fill=(*CREAM, 240))
    # Top border accent
    cdraw.rounded_rectangle((0, 0, CAPTION_W, 12), radius=6, fill=(*ROSE, 255))
    img.alpha_composite(card)

    # Text
    font = ImageFont.truetype(FONT_PATH, 60)
    lines = wrap_text(text, font, CAPTION_W - 80)
    # Recompute font size if too many lines
    while len(lines) > 4 and font.size > 36:
        font = ImageFont.truetype(FONT_PATH, font.size - 4)
        lines = wrap_text(text, font, CAPTION_W - 80)

    line_h = font.size + 14
    total_h = line_h * len(lines)
    y = (CAPTION_H - total_h) // 2 + 8
    for line in lines:
        w = font.getlength(line)
        x = (CAPTION_W - w) // 2
        # Soft shadow
        draw.text((x+2, y+2), line, font=font, fill=(0, 0, 0, 80))
        draw.text((x, y), line, font=font, fill=(*INK, 255))
        y += line_h

    img.save(out_png)

def compose(script_path: pathlib.Path, audio_path: pathlib.Path,
            out_path: pathlib.Path, photo_path: pathlib.Path) -> None:
    text = script_path.read_text(encoding='utf-8')
    chunks = clean_script(text)
    duration = audio_duration(audio_path)
    per = duration / max(len(chunks), 1)
    print(f'  Duration: {duration:.1f}s, {len(chunks)} captions ({per:.1f}s each)')

    # Render caption PNGs
    cap_dir = out_path.parent / f'.captions_{out_path.stem}'
    if cap_dir.exists():
        shutil.rmtree(cap_dir)
    cap_dir.mkdir(parents=True)
    for i, c in enumerate(chunks):
        render_caption(c, cap_dir / f'cap_{i:02d}.png')

    # Build ffmpeg inputs
    inputs = [
        '-loop', '1', '-framerate', '30', '-t', str(duration), '-i', str(photo_path),
        '-i', str(audio_path),
    ]
    for i in range(len(chunks)):
        inputs += ['-i', str(cap_dir / f'cap_{i:02d}.png')]

    # Filter chain: photo → cover-crop → Ken Burns zoom
    photo_chain = (
        f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
        f"crop=1080:1920,"
        f"zoompan=z='min(zoom+0.0005,1.06)':d={int(duration*30)}:s=1080x1920:fps=30[bg]"
    )
    overlays = [photo_chain]
    prev = 'bg'
    overlay_x = (W - CAPTION_W) // 2
    for i in range(len(chunks)):
        start = i * per
        end = (i + 1) * per
        out_label = f'v{i}' if i < len(chunks)-1 else 'vout'
        # input index for caption PNG is 2 + i
        overlays.append(
            f"[{prev}][{2+i}:v]overlay=x={overlay_x}:y={CAPTION_Y}:"
            f"enable='between(t,{start:.2f},{end:.2f})'[{out_label}]"
        )
        prev = out_label

    filter_complex = ';'.join(overlays)

    cmd = ['ffmpeg', '-y'] + inputs + [
        '-filter_complex', filter_complex,
        '-map', '[vout]', '-map', '1:a',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest', '-movflags', '+faststart',
        str(out_path),
    ]
    print(f'  Encoding: {out_path.name}')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-2500:], file=sys.stderr)
        sys.exit('ffmpeg failed')
    shutil.rmtree(cap_dir)
    print(f'✓ {out_path} ({out_path.stat().st_size//1024} KB)')

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('script')
    p.add_argument('audio')
    p.add_argument('out')
    p.add_argument('--photo', default=str(DEFAULT_PHOTO))
    args = p.parse_args()
    out_path = pathlib.Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    compose(
        pathlib.Path(args.script).resolve(),
        pathlib.Path(args.audio).resolve(),
        out_path,
        pathlib.Path(args.photo).resolve(),
    )
