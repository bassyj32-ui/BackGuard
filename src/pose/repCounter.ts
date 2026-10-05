import type { Frame } from './landmarks';
import { canMeasure, inRange, measure } from './angles';
import type { Exercise } from '../data/exercises';

/**
 * Counts a rep when the measured angle leaves the target range and returns to it.
 * Hysteresis band prevents double-counting from frame-to-frame noise around the
 * boundary.
 */
const HYSTERESIS_DEG = 3;

export type RepPhase = 'in-range' | 'out-of-range' | 'unavailable';

export interface RepState {
  reps: number;
  phase: RepPhase;
  /** Current measured value, for the readout. Null when unmeasurable. */
  value: number | null;
}

export function initialRepState(): RepState {
  return { reps: 0, phase: 'unavailable', value: null };
}

export function updateRepState(
  previous: RepState,
  frame: Frame,
  exercise: Exercise,
): RepState {
  const target = exercise.targets[0];
  if (!target) return previous;

  if (!canMeasure(frame, target.joint)) {
    return { ...previous, phase: 'unavailable', value: null };
  }

  const value = measure(target.joint, frame);
  if (value === null) {
    return { ...previous, phase: 'unavailable', value: null };
  }

  const withinTarget = inRange(value, target);
  const outsideTarget =
    previous.value === null
      ? false
      : !inRange(previous.value, {
          ...target,
          minDeg: target.minDeg - HYSTERESIS_DEG,
          maxDeg: target.maxDeg + HYSTERESIS_DEG,
        });

  // A rep completes on the out -> in transition.
  const completedRep = previous.phase === 'out-of-range' && withinTarget;
  const wasUnmeasured = previous.phase === 'unavailable';

  return {
    reps: previous.reps + (completedRep && !wasUnmeasured ? 1 : 0),
    phase: withinTarget ? 'in-range' : outsideTarget ? 'out-of-range' : 'in-range',
    value,
  };
}

/** Total reps expected, accounting for both sides where applicable. */
export function targetReps(exercise: Exercise): number {
  const base = exercise.reps ?? 0;
  return exercise.sides === 2 ? base * 2 : base;
}

/** Holds are counted as one unit when the hold duration is met. */
export function isHoldExercise(exercise: Exercise): boolean {
  return exercise.reps === undefined && exercise.holdSeconds !== undefined;
}