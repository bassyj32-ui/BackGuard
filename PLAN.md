# BackGuard — build plan

A daily ~3-minute back-care habit for people who sit a long time, coached by
on-device camera pose detection. No account, no backend, no video leaving the
device.

Status: **plan agreed, scaffold not yet built.** This document is the source of
truth. Update it as decisions change.

---

## 1. Product definition

**One job:** let someone who feels fine today do three minutes of evidence-based
back-care and get form feedback while doing it.

**Audience:** desk workers, students, drivers, and anyone with long sitting hours
who is at risk of low-back-pain episodes but has no symptoms yet.

**Core loop:** open app → pick today's set → coached session with live camera
feedback → see the isometric grid fill in → keep the streak.

**Non-goals:** diagnosis, treatment, pain management, clinical assessment,
social features, accounts, leaderboards.

---

## 2. Locked decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Platform | Installable web app / PWA (Vite + React + TS) | Installable on phones without an app store, free hosting on GitHub Pages. Matches the existing MalariaX stack. |
| Core loop | Exercise coach with form feedback | Gamifies the actual preventive exercise, not just reminders. |
| Data storage | Device only (`localStorage`) | No account, no backend, works offline. Progress is lost if the user clears site data or switches phones — accepted trade-off. |
| Form feedback | Camera pose detection (MediaPipe) | Real observed form, not scripted cues. |
| Isometric treatment | **Option B** — flat coaching, isometric chrome | Camera view stays flat so posture is judged clearly. Isometric is a reward/progress surface only. |
| Grid meaning | Reps raise blocks; a completed daily set fills the tile | Visible at-a-glance record of adherence. |
| Repo | `BackGuard`, public | Fresh repo, separate from Trim-AURAS. |
| Disclaimer | Visible on every screen | Required for a health app. |

---

## 3. Architecture

### Screens
```
Home      today's set, streak, start button
Session   mirrored camera + skeleton overlay + angle readout + rep counter
Progress  isometric grid, per-exercise completion, streak history
Learn     exercise library with cues, targets, evidence strength
Safety    disclaimer, red-flag symptoms, contraindications, privacy statement
```

### Source layout
```
src/
  App.tsx                 screen routing
  screens/                Home · Session · Progress · Learn · Safety
  pose/
    worker.ts             MediaPipe PoseLandmarker in a Web Worker
    landmarks.ts          landmark selection, smoothing
    angles.ts             joint-angle maths, image plane only
    repCounter.ts         rep detection from angle thresholds
  data/
    exercises.ts          the exercise library (content, not code)
  state/
    progress.ts           localStorage persistence
  components/
    PostureCamera.tsx     camera + skeleton overlay
    RepMeter.tsx
    ExerciseCard.tsx
    IsometricGrid.tsx     isometric rendering
    Disclaimer.tsx
public/
  manifest.webmanifest
  model/                  MediaPipe .task file, fetched at runtime and SW-cached
```

### Two planes, deliberately separated
- **Measurement plane: flat, image-plane only.** Angles come from 2D landmark
  coordinates in the video frame. MediaPipe's `z` is relative and unreliable, so
  it is never used for measurement. Postural assessment is done in the
  frontal/sagittal image plane anyway.
- **Presentation plane: isometric.** Used only for the progress grid. Skeleton
  landmarks are not used here; the grid is driven by rep counts and daily
  completion flags.

This separation is the central technical decision of the project. Do not
collapse it.

---

## 4. Exercise library

Structured data in `src/data/exercises.ts`. Each entry carries reps, hold
seconds, target angle ranges, cue text, contraindications, and an
evidence-strength flag.

**Program contents**
- **McGill Big 3** — curl-up, side-plank, bird-dog. The most evidence-backed
  programme for low-back-pain management and recurrence prevention.
- **Posture reset** — chin tucks, thoracic extension over a chair.
- **Hip mobility** — hip flexor and hamstring work. Targets the tight-short-hip
  pattern that raises low-back load during long sitting.
- **Sit-break micro-routine** — ~90 seconds. The frequency intervention for
  sedentary exposure.

**Honesty constraints, built into the content rather than hidden**
1. The evidence is strongest for *reducing recurrence in people who have already
   had an episode*. It is weaker for preventing a first episode. The app's
   primary claims must be framed around management and recurrence, not primary
   prevention.
2. Break-frequency guidance is softer than exercise guidance. Do not present
   timer intervals as equally established.
3. No exercise should be presented as a cure.

---

## 5. Safety requirements

Non-negotiable, present from the first commit.

- **Disclaimer on every screen.** Educational, not medical advice.
- **Red-flag screening.** Pain radiating down a leg, numbness, weakness,
  bowel/bladder change, or trauma routes to "see a clinician", never to an
  exercise.
- **Per-exercise contraindications**, checked before a set starts.
- **Stop-on-pain prompt** during every hold.
- **Banned vocabulary.** No "cure", "fix", "heal", "diagnose". Use "reduce risk",
  "manage".
- **Privacy statement.** No video leaves the device. No frames stored or
  uploaded. Stated plainly on the camera permission screen, because camera
  access in a health app is a legitimate concern.

---

## 6. Commit strategy

Four reviewable, independently revertable commits:

1. `chore: scaffold Vite React TS PWA` — manifest, service worker, install
   prompt, screen skeletons
2. `feat: research-based exercise library` — `src/data/exercises.ts` plus Home
   and Session reading from it
3. `feat: isometric progress grid` — projection maths, depth sorting, block
   heights per rep, tile completion, localStorage
4. `feat: on-device pose coaching` — MediaPipe worker, angles, rep counting,
   form cues, camera fallback

---

## 7. Isometric grid maths

Reuse the projection approach from the reference demo:
- `gridToScreen(row, col)` — isometric diamond projection, 2:1 tile ratio.
- `screenToGrid(x, y)` — algebraic inversion for input.
- Painter's-algorithm depth sort: iterate rows outer, columns inner, and stack
  blocks ground-upper levels so nearer tiles overdraw farther ones.
- Per-face shading from a single base colour, three multipliers for top, left,
  and right faces. Height darkens by a fixed factor per level.

Reps completed today → block height on that tile. Full daily set → tile
completed. State persisted in `localStorage`.

---

## 8. Camera and pose technical notes

- MediaPipe Tasks Vision `PoseLandmarker` in a **Web Worker**, so inference does
  not block the render loop.
- WASM runtime and `.task` model served from **`/public`**, not a CDN. A first
  load on a poor connection should not hard-fail.
- Model is roughly 3MB, fetched once, then held in the service-worker cache.
  The app must remain usable if the model fails to load.
- iOS Safari requirements: `playsinline`, `muted`, playback started from a user
  gesture, and an explicit fallback path.
- `getUserMedia` needs a secure context. Over plain http on a LAN IP it will
  fail, so camera testing requires a tunnel or an https preview origin.

---

## 9. Open risks

- **Citations unverified.** Web search was unavailable when this plan was
  written. The exercise content and its sourcing come from existing knowledge,
  not a fresh literature check. Before publishing, verify the McGill Big 3
  dosing and the recurrence-versus-prevention distinction.
- **Model licensing and asset size.** Confirm the MediaPipe licence permits
  redistribution in a public repo, and decide whether the `.task` file ships in
  git or a release step fetches it.
- **NoUncheckedIndexedAccess / exactOptionalPropertyTypes** are both on in
  `tsconfig.json`. Landmark arrays are index-heavy, so this will need careful
  narrowing rather than non-null assertions.

---

## 10. Design direction

Calm dark slate. The mirrored camera is the visual centre during sessions. The
isometric grid is the one memorable moment, on the progress screen. Tabular
figures for angle readouts so numbers do not jitter mid-animation. Motion only
where it communicates pose or progress, never decoratively.

Required floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
respected.