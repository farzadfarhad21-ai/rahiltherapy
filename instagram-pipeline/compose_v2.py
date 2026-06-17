#!/usr/bin/env python3
"""V2 composer: Whisper-synced captions + background music + multi-scene support.

Scenes can be: photos (with Ken Burns) OR Kling AI video clips.
Pass --scenes as a comma-separated list of files.

Usage:
  # Single photo (legacy compatible):
  python3 compose_v2.py audio/day-01.mp3 audio/day-01.json output/day-01.mp4 \\
      --scenes ../profile.jpg

  # Multiple scenes (will auto-distribute across the duration):
  python3 compose_v2.py audio/day-01.mp3 audio/day-01.json output/day-01.mp4 \\
      --scenes ../profile.jpg,kling/scene1.mp4,kling/scene2.mp4

  # With calm background music:
  python3 compose_v2.py audio/day-01.mp3 audio/day-01.json output/day-01.mp4 \\
      --scenes ../profile.jpg --music assets/calm.mp3
"""
import argparse, json, pathlib, subprocess, sys, shutil, math
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = pathlib.Path(__file__).parent
PROJECT = ROOT.parent
FONT = '/System/Library/Fonts/Supplemental/Tahoma Bold.ttf'

W, H = 1080, 1920
CAP_W, CAP_H = 1000, 280
CAP_Y = 1380  # closer to bottom-center, modern Reels style

ROSE = (138, 87, 79)
ROSE_LIGHT = (201, 148, 136)
WHITE = (255, 255, 255)
INK = (32, 24, 22)

def audio_duration(p: pathlib.Path) -> float:
    return float(json.loads(subprocess.check_output([
        'ffprobe','-v','error','-show_entries','format=duration','-of','json',str(p)
    ]))['format']['duration'])

def shape(t: str) -> str:
    return get_display(arabic_reshaper.reshape(t))

def wrap(text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines = []
    cur = ''
    for w in words:
        trial = (cur + ' ' + w).strip()
        if font.getlength(shape(trial)) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return [shape(l) for l in lines]

def render_caption(text: str, out_png: pathlib.Path) -> None:
    """Modern Reels-style caption: white text, thick rose outline, no card bg.
    Reads better over varied backgrounds (photo/Kling video)."""
    img = Image.new('RGBA', (CAP_W, CAP_H), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 78)
    lines = wrap(text, font, CAP_W - 40)
    while len(lines) > 3 and font.size > 48:
        font = ImageFont.truetype(FONT, font.size - 4)
        lines = wrap(text, font, CAP_W - 40)
    line_h = font.size + 18
    total_h = line_h * len(lines)
    y = (CAP_H - total_h) // 2

    stroke_w = 8
    for line in lines:
        w = font.getlength(line)
        x = (CAP_W - w) // 2
        # Stroke (rose outline) for legibility on any background
        draw.text((x, y), line, font=font, fill=WHITE,
                  stroke_width=stroke_w, stroke_fill=ROSE)
        y += line_h
    img.save(out_png)

def scene_duration_filter(scene_path: pathlib.Path, t_start: float, t_end: float,
                          input_idx: int) -> str:
    """Build filter for one scene segment, output 1080x1920 video stream."""
    seg_dur = t_end - t_start
    ext = scene_path.suffix.lower()
    if ext in ('.mp4','.mov','.webm','.mkv'):
        return (
            f"[{input_idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            f"crop=1080:1920,setsar=1,setpts=PTS-STARTPTS,"
            f"tpad=stop_mode=clone:stop_duration={seg_dur},trim=duration={seg_dur},"
            f"fps=30,setpts=PTS-STARTPTS[s{input_idx}]"
        )
    zframes = max(int(seg_dur * 30), 1)
    return (
        f"[{input_idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,"
        f"crop=1080:1920,setsar=1,"
        f"zoompan=z='min(zoom+0.0008,1.10)':d={zframes}:s=1080x1920:fps=30,"
        f"setsar=1,trim=duration={seg_dur},setpts=PTS-STARTPTS[s{input_idx}]"
    )

def compose(audio_path: pathlib.Path, sync_path: pathlib.Path,
            out_path: pathlib.Path, scenes: list[pathlib.Path],
            music_path: pathlib.Path | None) -> None:
    duration = audio_duration(audio_path)
    chunks = json.loads(sync_path.read_text(encoding='utf-8'))
    print(f'  Duration: {duration:.1f}s, {len(chunks)} synced captions, {len(scenes)} scene(s)')

    # Render caption PNGs
    cap_dir = out_path.parent / f'.cap_{out_path.stem}'
    if cap_dir.exists(): shutil.rmtree(cap_dir)
    cap_dir.mkdir(parents=True)
    for i, c in enumerate(chunks):
        render_caption(c['text'], cap_dir/f'cap_{i:03d}.png')

    # Distribute scenes evenly across duration
    n_scenes = len(scenes)
    seg_dur = duration / n_scenes
    scene_segments = [(i*seg_dur, (i+1)*seg_dur) for i in range(n_scenes)]

    # Build inputs:
    # 0..n_scenes-1: scene files (loop images, regular videos)
    # n_scenes: voice audio
    # [optional] n_scenes+1: music
    # [then]: caption PNGs
    inputs = []
    for i, s in enumerate(scenes):
        if s.suffix.lower() in ('.mp4','.mov','.webm','.mkv'):
            inputs += ['-stream_loop','-1','-i', str(s)]
        else:
            inputs += ['-loop','1','-framerate','30','-t', f'{seg_dur:.2f}','-i', str(s)]
    inputs += ['-i', str(audio_path)]
    audio_idx = n_scenes
    music_idx = None
    if music_path and music_path.exists():
        inputs += ['-stream_loop','-1','-i', str(music_path)]
        music_idx = audio_idx + 1
    cap_first_idx = (music_idx if music_idx is not None else audio_idx) + 1
    for i in range(len(chunks)):
        inputs += ['-i', str(cap_dir/f'cap_{i:03d}.png')]

    # Build scene chain
    filters = []
    for i, (t0, t1) in enumerate(scene_segments):
        filters.append(scene_duration_filter(scenes[i], t0, t1, i))
    # Concat scenes
    if n_scenes == 1:
        filters.append(f'[s0]copy[bg]')
    else:
        concat_inputs = ''.join(f'[s{i}]' for i in range(n_scenes))
        filters.append(f'{concat_inputs}concat=n={n_scenes}:v=1:a=0[bg]')

    # Overlay captions
    prev = 'bg'
    for i, c in enumerate(chunks):
        cap_input = cap_first_idx + i
        out_label = f'v{i}' if i < len(chunks)-1 else 'vout'
        ox = (W - CAP_W)//2
        filters.append(
            f"[{prev}][{cap_input}:v]overlay=x={ox}:y={CAP_Y}:"
            f"enable='between(t,{c['start']:.2f},{c['end']:.2f})'[{out_label}]"
        )
        prev = out_label

    # Audio mix: voice + music (music ducked to 18%)
    if music_idx is not None:
        filters.append(
            f"[{audio_idx}:a]volume=1.0[voice];"
            f"[{music_idx}:a]volume=0.18,afade=t=in:st=0:d=2,"
            f"afade=t=out:st={duration-2:.2f}:d=2[music];"
            f"[voice][music]amix=inputs=2:duration=first:dropout_transition=0[aout]"
        )
        amap = '[aout]'
    else:
        amap = f'{audio_idx}:a'

    cmd = ['ffmpeg','-y'] + inputs + [
        '-filter_complex', ';'.join(filters),
        '-map','[vout]','-map', amap,
        '-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','20',
        '-c:a','aac','-b:a','160k',
        '-t', f'{duration:.2f}',
        '-movflags','+faststart',
        str(out_path),
    ]
    print(f'  Encoding: {out_path.name} ({len(filters)} filter ops)')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-3000:], file=sys.stderr)
        sys.exit('ffmpeg failed')
    shutil.rmtree(cap_dir)
    print(f'✓ {out_path} ({out_path.stat().st_size//1024} KB)')

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('audio')
    p.add_argument('sync_json')
    p.add_argument('out')
    p.add_argument('--scenes', required=True, help='Comma-separated photo/video paths')
    p.add_argument('--music', default=None)
    args = p.parse_args()
    scenes = [pathlib.Path(s.strip()).resolve() for s in args.scenes.split(',')]
    for s in scenes:
        if not s.exists():
            sys.exit(f'Scene not found: {s}')
    music = pathlib.Path(args.music).resolve() if args.music else None
    out_path = pathlib.Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    compose(
        pathlib.Path(args.audio).resolve(),
        pathlib.Path(args.sync_json).resolve(),
        out_path, scenes, music,
    )
