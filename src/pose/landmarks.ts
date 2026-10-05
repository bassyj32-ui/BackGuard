import type { AngleTarget } from '../data/exercises';

/**
 * Minimal normalised landmark shape. Matches MediaPipe's PoseLandmarker output
 * after mapping, without importing the library into the app bundle. The worker
 * owns the real dependency.
 */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** Landmark indices we depend on, named so the maths reads clearly. */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type LandmarkName = keyof typeof LM;

export type MeasuredJoint = AngleTarget['joint'];

export interface Frame {
  landmarks: Landmark[];
  /** Timestamp of the frame in milliseconds. */
  timestamp: number;
}

export function hasVisible(landmarks: Landmark[], names: LandmarkName[]): boolean {
  return names.every((n) => {
    const lm = landmarks[LM[n]];
    return lm !== undefined;
  });
}

/**
 * Exponential smoothing to suppress per-frame jitter. `alpha` near 1 tracks the
 * signal closely; near 0 is heavily smoothed and lags behind real movement.
 */
export function smoothLandmarks(
  previous: Landmark[] | null,
  current: Landmark[],
  alpha = 0.5,
): Landmark[] {
  if (!previous || previous.length !== current.length) return current;
  return current.map((lm, i) => {
    const prev = previous[i];
    if (!prev) return lm;
    return {
      x: prev.x + (lm.x - prev.x) * alpha,
      y: prev.y + (lm.y - prev.y) * alpha,
      z: prev.z + (lm.z - prev.z) * alpha,
    };
  });
}