# Pose model files land here and are git-ignored on purpose.

BackGuard expects:

- `public/model/pose_landmarker_lite.task`  (~3 MB MediaPipe model)
- `public/model/wasm/`                     (MediaPipe WASM runtime, copied from
                                            `@mediapipe/tasks-vision/wasm`)

These are fetched at runtime and then held in the service-worker cache, so they
are deliberately not committed. To populate them after `npm install`:

```bash
cp node_modules/@mediapipe/tasks-vision/wasm public/model/wasm
```

The `.task` file must be downloaded separately from the MediaPipe model
repository, since it is not shipped inside the npm package. See PLAN.md section 9
for the open question about redistribution and licensing.

The app degrades rather than crashes when these are missing: the camera still
starts and the Session screen reports that the pose model could not load.