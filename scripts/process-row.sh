#!/bin/bash
# Kling kafa videosunu hero satırına çevirir: kafa bölgesini kırpar, her 4 karede anahtar kare koyar
# ve dönüş ilerleme tablosunu (lut) assets/hero/rows.json'a yazar.
# Kullanım: scripts/process-row.sh <kaynak.mp4> <mid|up|down>
set -euo pipefail
SRC="$1"; ROW="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/hero/head-$ROW.mp4"; [ "$ROW" = mid ] && OUT="$ROOT/assets/hero/head.mp4"
CROP="crop=420:460:748:250" # 1916x1080 karede kafa bölgesi; sahne plakasıyla hizalı
TMP="$(mktemp -d "${TMPDIR:-/tmp}/row.XXXX")"

ffmpeg -v error -y -i "$SRC" -an -vf "$CROP,format=yuv420p" -c:v libx264 -preset slow -crf 18 \
  -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart "$OUT"
N=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$OUT")
ffmpeg -v error -y -i "$SRC" -vf "select=eq(n\,0),$CROP" -frames:v 1 "$TMP/first.png"
ffmpeg -v error -y -i "$SRC" -vf "select=eq(n\,$((N-1))),$CROP" -frames:v 1 "$TMP/last.png"
for R in first last; do
  ffmpeg -v error -i "$SRC" -loop 1 -i "$TMP/$R.png" -filter_complex \
    "[0:v]$CROP,format=yuv420p[a];[1:v]format=yuv420p[b];[a][b]psnr=stats_file=$TMP/$R.log" \
    -frames:v "$N" -f null - 2>/dev/null
done
python3 -I - "$TMP" "$N" "$ROOT/assets/hero/rows.json" "$ROW" "${OUT#$ROOT/}" <<'PY'
import json, re, sys, os
tmp, n, path, row, src = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
mse = lambda f: [float(re.search(r'mse_avg:([\d.]+)', l).group(1)) for l in open(f)][:n]
a, b = mse(f'{tmp}/first.log'), mse(f'{tmp}/last.log')
p = [x / (x + y) if x + y else 0 for x, y in zip(a, b)]
m, c = [], 0
for v in p: c = max(c, v); m.append(c)  # monoton yap
lo, hi = m[0], m[-1]
lut = [round((v - lo) / (hi - lo), 3) for v in m]
data = json.load(open(path)) if os.path.exists(path) else {"fps": 24, "rows": {}}
data["rows"][row] = {"src": src, "lut": lut}
json.dump(data, open(path, 'w'), separators=(',', ':'))
print(f'{row}: {n} kare, orta (0.5) kare = {next(i for i, v in enumerate(lut) if v >= 0.5)}')
PY
rm -rf "${TMP:?}"
ls -la "$OUT"
