#!/usr/bin/env bash
# Render the six review styleframes to out/styleframes/
set -euo pipefail
cd "$(dirname "$0")/.."
npx tsx scripts/manifest.ts
mkdir -p out/styleframes
render() { npx remotion still "$1" "out/styleframes/$2.png" --frame="$3" --log=error; echo "  out/styleframes/$2.png"; }
render SF-Title 01-title 140
render SF-Fig1 02-fig1-overview 185
render SF-Claim 03-claim 170
render SF-Code 04-code 170
render SF-UI 05-dashboard 150
render SF-Alert 06-alert-fan 170
