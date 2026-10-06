/**
 * Coached session. Camera coaching is an opt-in enhancement, not a gate.
 *
 * Two input paths feed the same rep counter:
 *  - manual: tap or press space, which always works, no permissions needed
 *  - automatic: on-device pose detection counts reps when the user enables it
 *
 * The manual path is the default on purpose. A health app that demands a camera
 * before it will let you do a single rep is a health app most people abandon.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise } from '../data/exercises';
import type { Frame } from '../pose/landmarks';
import {
  initialRepState,
  isHoldExercise,
  updateRepState,
  type RepState,
} from '../pose/repCounter';
import { playDayComplete, playLevelUp, playRep, unlockAudio } from './audio';
import { goalFor } from './TownView';
import Disclaimer from '../components/Disclaimer';
import PostureCamera, { type CameraStatus } from '../components/PostureCamera';

interface SessionProps {
  exercise: Exercise;
  repsDone: number;
  onRep: (exerciseId: string) => void;
  onFinish: () => void;
  onExit: () => void;
}

export default function Session({ exercise, repsDone, onRep, onFinish, onExit }: SessionProps) {
  const [coachOn, setCoachOn] = useState(false);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [repState, setRepState] = useState<RepState>(initialRepState);
  const [cueIndex, setCueIndex] = useState(0);
  const [holdRemaining, setHoldRemaining] = useState(0);
  const [holding, setHolding] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const repCount = useRef(repsDone);
  repCount.current = repsDone;

  const goal = goalFor(exercise);
  const hold = isHoldExercise(exercise);
  const complete = repCount.current >= goal;

  const handleStatus = useCallback((next: CameraStatus) => setStatus(next), []);

  const handleFrame = useCallback(
    (frame: Frame) => {
      setRepState((prev) => {
        const next = updateRepState(prev, frame, exercise);
        // Only a genuinely new rep, and never while the plot is already full.
        if (next.reps > prev.reps && next.reps > repCount.current) {
          playRep(next.reps - 1);
          onRep(exercise.id);
        }
        return next;
      });
    },
    [exercise, onRep],
  );

  // Count down a hold once the user starts one.
  const startHold = useCallback(() => {
    if (holdTimer.current) return;
    const seconds = exercise.holdSeconds ?? 20;
    setHolding(true);
    setHoldRemaining(seconds);
    holdTimer.current = setInterval(() => {
      setHoldRemaining((r) => {
        if (r <= 1) {
          if (holdTimer.current) clearInterval(holdTimer.current);
          holdTimer.current = null;
          setHolding(false);
          if (repCount.current < goal) {
            onRep(exercise.id);
            playRep(repCount.current);
            playLevelUp();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, [exercise.holdSeconds, goal, onRep]);

  useEffect(() => () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
  }, []);

  // Rotate the coaching cue slowly so it is readable rather than flickery.
  useEffect(() => {
    const id = setInterval(() => {
      setCueIndex((i) => (i + 1) % Math.max(1, exercise.cues.length));
    }, 6000);
    return () => clearInterval(id);
  }, [exercise.cues.length]);

  // Keyboard: space does a rep without reaching for the phone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || complete) return;
      e.preventDefault();
      unlockAudio();
      if (hold) startHold();
      else {
        onRep(exercise.id);
        playRep(repCount.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [complete, exercise.id, hold, onRep, startHold]);

  const doRep = () => {
    unlockAudio();
    if (complete) return;
    if (hold) {
      startHold();
      return;
    }
    onRep(exercise.id);
    const next = repCount.current;
    playRep(next);
    if (next + 1 >= goal) {
      playLevelUp();
      playDayComplete();
    }
  };

  const pct = Math.min(1, repsDone / goal);

  return (
    <div className="play">
      <header className="play__bar">
        <button className="icon-button" onClick={onExit} aria-label="Back to town">
          ←
        </button>
        <div className="play__title">
          <h1>{exercise.name}</h1>
          <p>{exercise.summary}</p>
        </div>
      </header>

      {coachOn && (
        <div className="play__camera">
          <PostureCamera status={status} onStatus={handleStatus} onFrame={handleFrame} active />
        </div>
      )}

      <div className="play__stage">
        <div className="play__count">
          <span className="play__count-value">{repsDone}</span>
          <span className="play__count-goal">/ {goal}</span>
          <span className="play__count-unit">{hold ? 'holds' : 'reps'}</span>
        </div>

        <div className="play__meter" role="progressbar" aria-valuenow={repsDone} aria-valuemin={0} aria-valuemax={goal}>
          <div className="play__meter-fill" style={{ width: `${pct * 100}%` }} />
        </div>

        {hold && holding && (
          <p className="play__hold" aria-live="polite">
            Hold {holdRemaining}s
          </p>
        )}

        <p className="play__cue" aria-live="polite">
          {exercise.cues[cueIndex] ?? exercise.cues[0]}
        </p>

        {coachOn && status === 'ready' && (
          <p className={`play__angle play__angle--${repState.phase}`}>
            {repState.value === null
              ? 'Step back so your hips and shoulders are in frame.'
              : `${repState.value.toFixed(0)}° · ${repState.phase === 'in-range' ? 'good position' : 'adjust'}`}
          </p>
        )}
      </div>

      <ol className="cue-list">
        {exercise.cues.map((cue, i) => (
          <li
            key={cue}
            className={`cue${i === cueIndex ? ' cue--current' : ''}${i < cueIndex ? ' cue--done' : ''}`}
          >
            {cue}
          </li>
        ))}
      </ol>

      <button
        className={`rep-button${complete ? ' rep-button--done' : ''}`}
        onClick={doRep}
        disabled={complete && !hold}
      >
        <span className="rep-button__pulse" aria-hidden="true" />
        {complete ? (hold ? 'Hold again' : 'Built') : hold ? 'Hold' : 'Rep'}
        {!complete && !hold && <span className="rep-button__hint">or press space</span>}
      </button>

      <button
        className="coach-toggle"
        onClick={() => setCoachOn((v) => !v)}
        aria-pressed={coachOn}
      >
        <span className="coach-toggle__dot" aria-hidden="true" />
        {coachOn ? 'Camera coaching on' : 'Use camera for form feedback'}
      </button>

      {coachOn && status !== 'ready' && status !== 'idle' && <CoachStatus status={status} />}

      {complete && !hold && (
        <p className="play__done" role="status">
          {exercise.name} is built. Nice.
        </p>
      )}

      <button className="button button--primary" onClick={onFinish}>
        {complete ? 'Back to town' : 'Stop for today'}
      </button>

      <Disclaimer />
    </div>
  );
}

function CoachStatus({ status }: { status: CameraStatus }) {
  switch (status) {
    case 'requesting':
      return <p className="coach-status">Waiting for camera permission…</p>;
    case 'loading-model':
      return <p className="coach-status">Loading the on-device pose model, about 3 MB, once.</p>;
    case 'denied':
      return (
        <p className="coach-status">
          Camera blocked. That is fine, tap-based reps still work. You can also enable the camera
          for this site in your browser settings.
        </p>
      );
    case 'unsupported':
      return <p className="coach-status">This browser has no camera API. Tap-based reps still work.</p>;
    case 'error':
      return <p className="coach-status">The camera or pose model could not start. Tap-based reps still work.</p>;
    default:
      return null;
  }
}
