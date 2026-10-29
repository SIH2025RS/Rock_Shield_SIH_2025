#!/usr/bin/env bash
# Copy the team's real screenshots into public/ui, cropping out personal details.
#   bash scripts/prepare-screenshots.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="../Screenshots"
OUT="public/ui"
mkdir -p "$OUT"

# SMS alert: keep only the three alert bubbles (drops the sender number and the old verification code)
SMS="$SRC/Alert Notifications/WhatsApp Image 2025-12-09 at 17.04.29_783f9817.jpg"
ffmpeg -v error -y -i "$SMS" -vf "crop=719:830:0:555" -q:v 2 "$OUT/sms-alerts.jpg"
# Full phone screen with the sender number and the old verification-code bubble blurred
ffmpeg -v error -y -i "$SMS" -filter_complex \
  "[0]crop=200:70:180:105,boxblur=14:3[n];[0]crop=560:80:10:482,boxblur=14:3[v];[0][n]overlay=180:105[a];[a][v]overlay=10:482" \
  -q:v 2 "$OUT/sms-phone.jpg"

cp "$SRC/Dashboard/Screenshot 2025-12-09 165931.png" "$OUT/dashboard-analytics.png"
cp "$SRC/Dashboard/Screenshot 2025-12-09 105326.png" "$OUT/dashboard-2.png"
cp "$SRC/Dashboard/Screenshot 2025-12-09 164230.png" "$OUT/dashboard-3.png"
cp "$SRC/Multilingual/Screenshot 2025-12-09 170135.png" "$OUT/multilingual-tamil.png"
cp "$SRC/Multilingual/Screenshot 2025-12-09 170122.png" "$OUT/multilingual-2.png"
cp "$SRC/App Alerts/WhatsApp Image 2025-12-09 at 17.20.50_d1598948.jpg" "$OUT/mobile-miner-home.jpg"
cp "$SRC/App Alerts/WhatsApp Video 2025-12-09 at 17.28.24_b519be0c.mp4" "$OUT/mobile-alerts.mp4"
cp "../ai-ml/Model Training Result/ROC Curve - Enesemble.jpg" "$OUT/roc-ensemble.jpg"
cp "../ai-ml/Model Training Result/ROC Curve - XGBoost.jpg" "$OUT/roc-xgboost.jpg"
cp "../ai-ml/Model Training Result/ROC Curve - LSTM.jpg" "$OUT/roc-lstm.jpg"
cp "../ai-ml/Model Training Result/Training vs Validation Loss.jpg" "$OUT/training-loss.jpg"
cp "../ai-ml/Model Training Result/confusion Matrix.jpg" "$OUT/confusion-matrix.jpg"
echo "public/ui ready:"; ls "$OUT"
