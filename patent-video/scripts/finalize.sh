#!/usr/bin/env bash
# Final master: two-pass loudness normalisation (−16 LUFS, −1.5 dBTP) with the video stream copied,
# then a format check and a thumbnail.
#   bash scripts/finalize.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=out/RockShield_Patent_Claims_1080p_raw.mp4
FINAL=out/RockShield_Patent_Claims_1080p.mp4

measure=$(ffmpeg -hide_banner -i "$RAW" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { python3 -c "import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])" "$measure" "$1"; }
ffmpeg -v error -y -i "$RAW" -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$FINAL"

echo "Loudness before: $(get input_i) LUFS"
ffmpeg -hide_banner -i "$FINAL" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate -show_entries format=duration,size -of compact "$FINAL"
npx remotion still SF-Title out/RockShield_Patent_Claims_thumbnail.png --frame=140 --log=error
echo "Final: $FINAL"
