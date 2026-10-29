# RockShield patent claims video

A code-built motion-graphics video that explains the 18 claims of the Form 2 complete specification
(*System and Method for Edge-Based Multi-Modal Geotechnical Hazard Prediction…*). It is made with
[Remotion](https://www.remotion.dev): every frame is rendered from React, so any chapter can be edited and
re-rendered.

## What is real and what is illustrative
Every scene carries a corner tag:
- **PROTOTYPE**: real material from this repository. That covers app screenshots, source code at real line
  numbers, model outputs, the SMS received in testing, and satellite and terrain imagery of the Jharia site.
- **EMBODIMENT**: animation of claimed scope that the prototype does not implement.

The sensor data comes from the simulated dataset in `ai-ml/rockfall-prediction-system/Datasets`, and the
video says so on screen.

## Rebuild
```bash
npm install
npm run claims          # exact claim text + FIG. 1 from the docx (claims:check verifies nothing drifted)
npm run data            # real model outputs, metrics, example sequence (uses the ML service venv)
npm run code            # syntax-highlighted snippets of the real source files
npm run site            # satellite imagery + terrain (Mapbox token from frontend/.env)
npm run screens         # copies the team's screenshots, cropping personal details
npm run tts             # narration (Google Cloud Chirp 3 HD, en-IN-Chirp3-HD-Iapetus); see below
npm run align           # word timing with whisper.cpp (local, free) → captions and beat cues
npm run check           # renders 3 frames per chapter into contact sheets (out/check/)
npm run render          # full 1080p master
npm run srt             # subtitle files (.srt / .vtt)
npm run finalize        # loudness normalisation to −16 LUFS + format check + thumbnail
```
Preview and edit interactively with `npm run studio`.

## Narration and cost
The narration key goes in `patent-video/.env.local` as `GOOGLE_TTS_API_KEY=…`. That file is ignored by git.

`scripts/lib/google-tts.ts` allows only voice types that have a free monthly allowance. It logs every
character sent in `out/tts-usage.json` and refuses to go beyond 250,000 characters a month, a quarter of the
free 1,000,000. A full narration take is about 12,000 characters.

To re-voice after editing `content/script.md`:
```bash
npm run tts -- ch05   # only the chapters you changed
npm run align         # re-time everything; animations follow the new audio automatically
```

## Layout
- `content/script.md` holds the narration, with `[[beat:name]]` markers where visuals change.
- `content/claims.json` is the claim text, generated from the docx and never edited by hand.
- `src/chapters/Chapters.tsx` holds one component per chapter, with shots keyed to beats.
- `src/components/` holds `Fig1World` (animated FIG. 1), `ClaimDocument`, `CodeScroller`, the frames and the scenes.
- `public/` holds audio, data, imagery and screenshots.
- `scripts/` holds every build step above.
