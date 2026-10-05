import { hasVisible, LM, type Frame, type Landmark, type LandmarkName, type MeasuredJoint } from './landmarks';
import type { AngleTarget } from '../data/exercises';

/**
 * Angle maths, measured in the IMAGE PLANE only.
 *
 * Landmarks are in normalised image coordinates, so x and y are directly
 * comparable. MediaPipe's `z` is relative depth and unreliable, so it is never
 * used for measurement. See PLAN.md section 3.
 */

const RAD_TO_DEG = 180 / Math.PI;

export function angleAt(
  landmarks: Landmark[],
  vertex: LandmarkName,
  a: LandmarkName,
  b: LandmarkName,
): number | null {
  const v = landmarks[LM[vertex]];
  const p1 = landmarks[LM[a]];
  const p2 = landmarks[LM[b]];
  if (!v || !p1 || !p2) return null;

  const v1x = p1.x - v.x;
  const v1y = p1.y - v.y;
  const v2x = p2.x - v.x;
  const v2y = p2.y - v.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return null;

  return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * RAD_TO_DEG;
}

/**
 * Trunk inclination relative to vertical, in degrees. Zero means the shoulder
 * line sits directly above the hip line. Positive means leaning forward.
 */
export function trunkAngle(landmarks: Landmark[]): number | null {
  const ls = landmarks[LM.leftShoulder];
  const rs = landmarks[LM.rightShoulder];
  const lh = landmarks[LM.leftHip];
  const rh = landmarks[LM.rightHip];
  if (!ls || !rs || !lh || !rh) return null;

  const midShoulderX = (ls.x + rs.x) / 2;
  const midShoulderY = (ls.y + rs.y) / 2;
  const midHipX = (lh.x + rh.x) / 2;
  const midHipY = (lh.y + rh.y) / 2;

  // Image y grows downward, so negate to get a conventional upward axis.
  const dx = midShoulderX - midHipX;
  const dy = -(midShoulderY - midHipY);
  return Math.atan2(dx, dy) * RAD_TO_DEG;
}

/**
 * Lumbar curvature proxy: how much the trunk bows away from the hip-to-shoulder
 * line. Approximated from shoulder and hip width relative to the trunk length,
 * which is what a side-view curl-up changes most visibly.
 */
export function lumbarProxy(landmarks: Landmark[]): number | null {
  const ls = landmarks[LM.leftShoulder];
  const rs = landmarks[LM.rightShoulder];
  const lh = landmarks[LM.leftHip];
  const rh = landmarks[LM.rightHip];
  if (!ls || !rs || !lh || !rh) return null;

  const trunkLength = Math.hypot(
    (ls.x + rs.x) / 2 - (lh.x + rh.x) / 2,
    (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2,
  );
  if (trunkLength < 1e-6) return null;

  const hipWidth = Math.hypot(lh.x - rh.x, lh.y - rh.y);
  const shoulderWidth = Math.hypot(ls.x - rs.x, ls.y - rs.y);
  const widthRatio = (hipWidth + shoulderWidth) / 2 / trunkLength;
  return widthRatio * 100;
}

export function kneeAngle(landmarks: Landmark[], side: 'left' | 'right'): number | null {
  const hip = side === 'left' ? LM.leftHip : LM.rightHip;
  const knee = side === 'left' ? LM.leftKnee : LM.rightKnee;
  const ankle = side === 'left' ? LM.leftAnkle : LM.rightAnkle;
  const hipLm = landmarks[hip];
  const kneeLm = landmarks[knee];
  const ankleLm = landmarks[ankle];
  if (!hipLm || !kneeLm || !ankleLm) return null;

  const v1x = hipLm.x - kneeLm.x;
  const v1y = hipLm.y - kneeLm.y;
  const v2x = ankleLm.x - kneeLm.x;
  const v2y = ankleLm.y - kneeLm.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return null;
  return Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * RAD_TO_DEG;
}

export function hipAngle(landmarks: Landmark[], side: 'left' | 'right'): number | null {
  return side === 'left'
    ? angleAt(landmarks, 'leftHip', 'leftShoulder', 'leftKnee')
    : angleAt(landmarks, 'rightHip', 'rightShoulder', 'rightKnee');
}

/** Map an exercise target to a measured value in degrees, or null if unavailable. */
export function measure(joint: MeasuredJoint, frame: Frame): number | null {
  const { landmarks } = frame;
  switch (joint) {
    case 'spine':
      return lumbarProxy(landmarks);
    case 'hip':
      return hipAngle(landmarks, 'left') ?? hipAngle(landmarks, 'right');
    case 'knee':
      return kneeAngle(landmarks, 'left') ?? kneeAngle(landmarks, 'right');
    case 'shoulder':
      return angleAt(landmarks, 'leftShoulder', 'leftHip', 'leftElbow');
  }
}

export function inRange(value: number | null, target: AngleTarget): boolean {
  if (value === null) return false;
  return value >= target.minDeg && value <= target.maxDeg;
}

/** Landmarks required before we can trust any measurement for a joint. */
export function requiredLandmarks(joint: MeasuredJoint): LandmarkName[] {
  switch (joint) {
    case 'spine':
      return ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
    case 'hip':
      return ['leftShoulder', 'rightShoulder', 'rightHip', 'rightKnee'];
    case 'knee':
      return ['leftHip', 'rightHip', 'leftKnee', 'rightKnee'];
    case 'shoulder':
      return ['leftHip', 'leftShoulder', 'leftElbow'];
  }
}

export function canMeasure(frame: Frame, joint: MeasuredJoint): boolean {
  return hasVisible(frame.landmarks, requiredLandmarks(joint));
}