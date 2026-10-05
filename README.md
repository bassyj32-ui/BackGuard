# BackGuard

A daily ~3-minute back-care habit for people who sit a long time, coached by
on-device camera pose detection. No account, no backend, no video leaving the
device.

**Live at https://bassyj32-ui.github.io/BackGuard/**

> **Status:** early build. See [PLAN.md](./PLAN.md) for the full agreed plan.
>
> **This is not medical advice.** BackGuard is an educational tool for reducing
> risk and building a movement habit. It does not diagnose or treat anything.
> See a clinician for pain, numbness, or weakness.

## Why

Long sitting is extremely common and is a recognised risk factor for low-back
pain. Most preventive advice is either a PDF nobody reads or a reminder app
that nags without helping. BackGuard is the middle: a short coached session
with real form feedback, built on established exercise research.

## How it works

1. **Home** — today's set and your streak.
2. **Session** — mirrored camera, live skeleton overlay, joint-angle readout,
   and a rep counter. Angles are measured in the flat image plane, which is how
   postural assessment is actually done.
3. **Progress** — an isometric grid where completed reps raise blocks and a
   finished daily set fills in the tile.

Everything is stored on your device. There is no account and no server. The
camera feed is processed in the browser and is never recorded or uploaded.

## Development

```bash
npm install
npm run dev
```

The camera needs a secure context (`https` or `localhost`). Testing on a phone
over the local network requires a tunnel, because `http://<lan-ip>` is not a
secure context and `getUserMedia` will fail.

## Tech

Vite, React, TypeScript. MediaPipe Tasks Vision for pose landmarks, running in a
Web Worker. Installable PWA.

## Licence

Not yet chosen. Add one before publishing publicly.