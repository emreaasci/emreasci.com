#!/usr/bin/env python3
"""Bakış atlası: düz satırın her karesi için yukarı/aşağı satırla arasında ara pozlar üretir.

Ara pozlar ffmpeg minterpolate (hareket telafili ara kare) ile çizilir. Sonuç tek video:
kare indeksi = seviye * sütun_sayısı + sütun. Seviye 0 en yukarı, en sonuncusu en aşağı.
Kullanım: scripts/build-gaze.py <düz.mp4> [--up yukarı.mp4] [--down aşağı.mp4]
"""
import argparse, json, os, shutil, subprocess, sys, tempfile

CROP = 'crop=420:460:748:250'  # 1916x1080 karede kafa bölgesi; sahne plakasıyla hizalı
STEPS = 6                       # iki uç arasında ara poz sayısı
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)

def extract(src, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    ff('-i', src, '-vf', CROP, os.path.join(out_dir, '%03d.png'))
    return sorted(os.listdir(out_dir))

def frame_for_progress(lut, p):
    i = 0
    while i < len(lut) and lut[i] < p: i += 1
    if i == 0: return 0
    if i >= len(lut): return len(lut) - 1
    span = lut[i] - lut[i - 1]
    return i - 1 + ((p - lut[i - 1]) / span if span else 0)

def between(a, b, tmp):
    """a ile b arasında STEPS ara poz; dönen liste a'dan b'ye sıralı (uçlar hariç)."""
    seq = os.path.join(tmp, 'seq'); shutil.rmtree(seq, ignore_errors=True); os.makedirs(seq)
    for k, src in enumerate([a, a, b, b], 1): shutil.copy(src, os.path.join(seq, f's{k}.png'))
    fps = STEPS + 1
    ff('-framerate', '1', '-i', os.path.join(seq, 's%d.png'),
       '-vf', f'minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1',
       os.path.join(seq, 'o_%03d.png'))
    # 1. saniyedeki kare a, 2. saniyedeki b; aradakiler ara pozlar
    return [os.path.join(seq, f'o_{fps + 1 + k:03d}.png') for k in range(1, STEPS + 1)]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mid'); ap.add_argument('--up'); ap.add_argument('--down')
    args = ap.parse_args()
    rows = json.load(open(os.path.join(ROOT, 'assets/hero/rows.json')))
    tmp = tempfile.mkdtemp(prefix='gaze.')
    try:
        mid = [os.path.join(tmp, 'mid', f) for f in extract(args.mid, os.path.join(tmp, 'mid'))]
        cols = len(mid)
        mid_lut = rows['rows']['mid']['lut']
        sides = {}
        for name in ('up', 'down'):
            src = getattr(args, name)
            if not src: continue
            frames = [os.path.join(tmp, name, f) for f in extract(src, os.path.join(tmp, name))]
            lut = rows['rows'][name]['lut']
            levels = [[] for _ in range(STEPS + 1)]  # 0: düza en yakın ara poz ... STEPS: uç poz
            for i in range(cols):
                j = round(frame_for_progress(lut, mid_lut[i]))  # aynı yatay dönüşteki kare
                inter = between(mid[i], frames[j], tmp)
                for k, path in enumerate(inter):
                    keep = os.path.join(tmp, f'{name}_{k}_{i:03d}.png'); shutil.copy(path, keep)
                    levels[k].append(keep)
                levels[STEPS].append(frames[j])
                print(f'\r{name}: {i + 1}/{cols}', end='', file=sys.stderr)
            print(file=sys.stderr)
            sides[name] = levels
        # Seviyeler: en yukarıdan en aşağıya
        order = list(reversed(sides.get('up', []))) + [mid] + sides.get('down', [])
        mid_level = len(sides.get('up', []))
        seq = os.path.join(tmp, 'atlas'); os.makedirs(seq)
        n = 0
        for level in order:
            for path in level:
                shutil.copy(path, os.path.join(seq, f'{n:05d}.png')); n += 1
        out = os.path.join(ROOT, 'assets/hero/gaze.mp4')
        ff('-framerate', '24', '-i', os.path.join(seq, '%05d.png'), '-vf', 'format=yuv420p',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-g', '4', '-keyint_min', '4',
           '-sc_threshold', '0', '-movflags', '+faststart', out)
        rows['gaze'] = {'src': 'assets/hero/gaze.mp4', 'cols': cols, 'levels': len(order), 'mid': mid_level}
        json.dump(rows, open(os.path.join(ROOT, 'assets/hero/rows.json'), 'w'), separators=(',', ':'))
        print(f'gaze.mp4: {len(order)} seviye x {cols} sütun, {os.path.getsize(out) // 1024} KB')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

main()
