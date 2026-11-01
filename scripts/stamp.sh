#!/bin/bash
# index.html'deki yerel css/js linklerine sürüm etiketi (?v=) basar; tarayıcı önbelleği eski dosyayı kullanamaz.
# Kullanım: scripts/stamp.sh  (her değişiklikten sonra ya da yayından önce)
set -euo pipefail
cd "$(dirname "$0")/.."
V=$(date +%Y%m%d%H%M%S)
sed -E -i '' "s#(href|src)=\"(css|js)/([a-z0-9-]+)\.(css|js)(\?v=[0-9]+)?\"#\1=\"\2/\3.\4?v=$V\"#g" index.html
grep -c "?v=$V" index.html
