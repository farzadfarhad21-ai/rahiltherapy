#!/usr/bin/env python3
"""Generate word-level subtitle timings from the generated MP3 using Whisper.
Outputs an ASS subtitle file with brand styling, ready for ffmpeg burn-in.

Why local Whisper: ElevenLabs' timestamp endpoint only returns char-level for
some models, and Whisper gives us word-level accuracy that we can group into
3-5 word caption chunks for snappy Reel-style subtitles.

Usage:
  python3 transcribe.py audio/day-01.mp3 audio/day-01.ass
"""
import sys, pathlib, json
import whisper

MODEL_NAME = 'small'  # 'tiny'(fast/rough), 'base', 'small'(good), 'medium'(slow/great)

def ass_time(t: float) -> str:
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    cs = int((s - int(s)) * 100)
    return f'{h}:{m:02d}:{int(s):02d}.{cs:02d}'

def chunk_words(words: list[dict], max_chars: int = 40, max_words: int = 6) -> list[dict]:
    """Group word-level segments into snappy 3-6 word caption chunks."""
    chunks, current, current_chars = [], [], 0
    for w in words:
        wt = w['word'].strip()
        if not wt:
            continue
        if current and (current_chars + len(wt) + 1 > max_chars or len(current) >= max_words):
            chunks.append({
                'start': current[0]['start'],
                'end': current[-1]['end'],
                'text': ' '.join(c['word'].strip() for c in current),
            })
            current, current_chars = [], 0
        current.append(w)
        current_chars += len(wt) + 1
    if current:
        chunks.append({
            'start': current[0]['start'],
            'end': current[-1]['end'],
            'text': ' '.join(c['word'].strip() for c in current),
        })
    return chunks

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Tahoma,76,&H00FFFFFF,&H00FFFFFF,&H00604A57,&H80000000,1,0,0,0,100,100,0,0,1,5,2,2,80,80,360,178

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

def write_ass(chunks: list[dict], out_path: pathlib.Path) -> None:
    lines = [ASS_HEADER]
    for c in chunks:
        lines.append(
            f"Dialogue: 0,{ass_time(c['start'])},{ass_time(c['end'])},"
            f"Default,,0,0,0,,{c['text']}\n"
        )
    out_path.write_text(''.join(lines), encoding='utf-8')

def transcribe(audio_path: pathlib.Path, out_json: pathlib.Path) -> int:
    print(f'  Loading Whisper {MODEL_NAME} model...')
    model = whisper.load_model(MODEL_NAME)
    print(f'  Transcribing {audio_path.name} (Persian, word-level)...')
    result = model.transcribe(str(audio_path), language='fa', word_timestamps=True,
                              verbose=False)
    words = []
    for seg in result['segments']:
        for w in seg.get('words', []):
            words.append({'word': w['word'], 'start': w['start'], 'end': w['end']})
    chunks = chunk_words(words)
    out_json.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'✓ {out_json} ({len(chunks)} synced caption chunks)')
    return len(chunks)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: transcribe.py <audio.mp3> <out.json>')
    transcribe(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
