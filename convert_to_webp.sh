#!/bin/bash
# ponytail: convert greenscreen mp4 -> webp anim transparan
# butuh: ffmpeg (sudo apt install ffmpeg)
# jalanin dari folder drink_chrome_extension:  bash convert_to_webp.sh
set -e
cd "$(dirname "$0")"

# tuning chromakey: 0x00ff00 = hijau, 0.3 similarity, 0.2 blend
# kalau pinggiran masih hijau, naikkan 0.3 -> 0.35. kalau kepotong badan, turunkan.
echo "Converting pengamen_datang.mp4 -> pengamen_datang.webp ..."
ffmpeg -y -i assets/pengamen_datang.mp4 \
  -vf "chromakey=0x00ff00:0.32:0.15,scale=720:-1:flags=lanczos" \
  -c:v libwebp_anim -lossless 0 -q:v 75 -loop 0 -an assets/pengamen_datang.webp

echo "Converting pengamen_nyanyi.mp4 -> pengamen_nyanyi.webp ..."
ffmpeg -y -i assets/pengamen_nyanyi.mp4 \
  -vf "chromakey=0x00ff00:0.32:0.15,scale=720:-1:flags=lanczos" \
  -c:v libwebp_anim -lossless 0 -q:v 75 -loop 0 -an assets/pengamen_nyanyi.webp

echo "Done. Reload extension di chrome://extensions"
ls -lh assets/*.webp
