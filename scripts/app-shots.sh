#!/bin/bash
# Bir uygulamanın düz ekran görüntülerini telefona koyulacak hale getirir:
#   scripts/app-shots.sh <slug> ekran1.png ekran2.png ...
# Çıktı: assets/apps/<slug>/1.webp, 2.webp ... (780 px genişlik)
set -euo pipefail
slug="${1:?slug gerekli (ör. adilpazar)}"
shift
[ "$#" -gt 0 ] || { echo "en az bir görsel gerekli" >&2; exit 1; }
out="$(cd "$(dirname "$0")/.." && pwd)/assets/apps/$slug"
mkdir -p "$out"
rm -f "${out:?}"/*.webp
i=0
for src in "$@"; do
  i=$((i + 1))
  cwebp -quiet -q 82 -resize 780 0 "$src" -o "$out/$i.webp"
done
ls -l "$out"
