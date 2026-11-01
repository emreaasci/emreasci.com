#!/usr/bin/env python3
"""Bir videoyu WebP karelerine ayırıp tek dosyada paketler.

Safari duraklatılmış videoda kare atlamayı askıya alabildiği için kafa ve kamera video yerine
bu karelerle çizilir. Kullanım:
  scripts/frames.py assets/hero/look.mp4 assets/hero/look.json
  scripts/frames.py assets/desk/camera.mp4 assets/desk/camera.json
Kareler meta dosyasının yanına aynı adla .frames olarak yazılır; meta dosyasındaki diğer alanlar korunur.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1])
meta_path = root / sys.argv[2]
out = meta_path.with_suffix('.frames')

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-c:v', 'libwebp', '-quality', '70',
                    '-compression_level', '6', '-start_number', '0', f'{tmp}/%03d.webp'], check=True)
    data = [f.read_bytes() for f in sorted(Path(tmp).glob('*.webp'))]

out.write_bytes(b''.join(data))
meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
meta.pop('fps', None)
meta.update(src=str(out.relative_to(root)), frames=len(data), sizes=[len(d) for d in data])
meta_path.write_text(json.dumps(meta, separators=(',', ':')) + '\n')
print(f'{len(data)} kare, {out.stat().st_size // 1024} KB')
