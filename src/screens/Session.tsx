import { useCallback, useRef, useState } from 'react';
import type { Exercise } from '../data/exercises';
import type { Frame } from '../pose/landmarks';
import { initialRepState, isHoldExercise, targetReps, updateRepState, type RepState } from '../pose/repCounter';
import { recordRep } from '../state/progress';
import Disclaimer from '../components/Disclaimer';
import PostureCamera, { type CameraStatus } from '../components/PostureCamera';

interface SessionProps {
  exercise: Exercise;
  onExit: () => void;
  onFinished: (exercise: Exercise, reps: number) => void;
}

export default function Session({ exercise, onExit, onFinished }: SessionProps) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [repState, setRepState] = useState<RepState>(initialRepState);
  const [cueIndex, setCueIndex] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const goal = targetReps(exercise);
  const hold = isHoldExercise(exercise);

  const handleStatus = useCallback((next: CameraStatus) => {
    setStatus(next);
  }, []);

  const handleFrame = useCallback(
    (frame: Frame) => {
      setRepState((prev) => {
        const next = updateRepState(prev, frame, exercise);
        if (next.reps !== prev.reps) {
          recordRep(exercise.id);
        }
        return next;
      });
      // Advance the visible cue on a slow cadence so it is readable, not flickery.
      const cue = Math.min(exercise.cues.length - 1, Math.floor(Date.now() / 6000) % exercise.cues.length);
      setCueIndex(cue);
    },
    [exercise],
  );

  const finish = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    onFinished(exercise, repState.reps);
  }, [exercise, onFinished, repState.reps]);

  return (
    <div className="screen screen--session">
      <header className="session__header">
        <button className="button button--quiet" onClick={onExit}>
          Back
        </button>
        <h1 className="session__title">{exercise.name}</h1>
      </header>

      <PostureCamera status={status} onStatus={handleStatus} onFrame={handleFrame} active />

      <div className="session__hud">
        <RepMeter state={repState} goal={goal} hold={hold} />
        <p className="session__cue">{exercise.cues[cueIndex] ?? exercise.cues[0]}</p>
        <p className="session__note">
          {hold
            ? `Hold ${exercise.holdSeconds ?? 20} seconds per side. Keep breathing.`
            : `${goal} total${exercise.sides === 2 ? ', counting both sides' : ''}.`}
        </p>
      </div>

      <div className="session__actions">
        <button className="button button--primary" onClick={finish} disabled={repState.phase === 'unavailable'}>
          Save and finish
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}

function RepMeter({ state, goal, hold }: { state: RepState; goal: number; hold: boolean }) {
  const label = hold ? 'hold' : 'reps';
  return (
    <div className="rep-meter">
      <span className="rep-meter__count">
        {state.reps}
        <span className="rep-meter__goal">/{hold ? '1' : goal}</span>
        <span className="rep-meter__unit">{label}</span>
      </span>
      <AngleReadout state={state} />
    </div>
  );
}

function AngleReadout({ state }: { state: RepState }) {
  if (state.value === null) {
    return (
      <span className="angle-readout angle-readout--waiting">
        {state.phase === 'unavailable' ? 'Step back so your hips and shoulders are in frame.' : 'Hold still.'}
      </span>
    );
  }
  return (
    <span className="angle-readout">
      <span className="angle-readout__value">{state.value.toFixed(0)}°</span>
      <span className={`angle-readout__state angle-readout__state--${state.phase}`}>
        {state.phase === 'in-range' ? 'good' : 'adjust'}
      </span>
    </span>
  );
}