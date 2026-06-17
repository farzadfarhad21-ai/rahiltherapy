#!/usr/bin/env python3
"""End-to-end: script → voice (ElevenLabs v3) → video (1080x1920 Instagram Reel).

Usage:
  python3 generate.py scripts/day-02-pain.txt
  python3 generate.py scripts/day-02-pain.txt --photo /path/to/portrait.jpg

Output goes to audio/<name>.mp3 and output/<name>.mp4.
Re-runs reuse cached audio (skip ElevenLabs cost) unless --force.
"""
import argparse, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).parent

def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd)
    if r.returncode != 0:
        sys.exit(r.returncode)

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('script', help='Path to script .txt file')
    p.add_argument('--photo', help='Override portrait photo')
    p.add_argument('--force', action='store_true', help='Re-generate audio even if cached')
    args = p.parse_args()

    script_path = pathlib.Path(args.script).resolve()
    name = script_path.stem
    audio_path = ROOT / 'audio' / f'{name}.mp3'
    video_path = ROOT / 'output' / f'{name}.mp4'

    if audio_path.exists() and not args.force:
        print(f'⟳ Reusing cached audio: {audio_path.name}')
    else:
        print(f'→ Generating voice...')
        run(['python3', str(ROOT/'generate_audio.py'), str(script_path), str(audio_path)])

    print(f'→ Composing video...')
    cmd = ['python3', str(ROOT/'compose_video.py'),
           str(script_path), str(audio_path), str(video_path)]
    if args.photo:
        cmd += ['--photo', args.photo]
    run(cmd)

    print(f'\n✓ Done: {video_path}')
    print(f'  Open with: open {video_path}')
