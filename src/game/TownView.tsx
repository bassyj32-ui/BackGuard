/**
 * The town view. Owns the animation loop, pointer handling, and the mapping from
 * a rep to a visible change in the diorama.
 *
 * Progress is expressed spatially: each exercise in the daily set owns a plot,
 * and doing its reps builds that plot up. Tapping a plot logs a rep right there,
 * so the fastest possible interaction is also the primary one. Opening the
 * coached session is a deliberate second step, because that screen asks for the
 * camera and the tap path should not.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { Exercise } from '../data/exercises';
import { getDailySet } from '../data/exercises';
import { playLevelUp, playRep, playTick, unlockAudio } from './audio';
import { project } from './iso';
import { Labels, Particles } from './particles';
import {
  advance,
  bumpPop,
  createRendererState,
  drawScene,
  hitTest,
  makeProjection,
  setTargets,
  type RendererState,
} from './renderer';
import { buildTown } from './town';
import type { Progress } from '../state/progress';

const SEED = 20260106;

export function goalFor(exercise: Exercise): number {
  if (exercise.reps !== undefined) {
    return exercise.sides === 2 ? exercise.reps * 2 : exercise.reps;
  }
  return exercise.sides === 2 ? 2 : 1;
}

interface TownViewProps {
  progress: Progress;
  repsToday: number;
  onRep: (exerciseId: string) => void;
  onCoach: (exercise: Exercise) => void;
  /** Reps arriving from outside the canvas: keyboard or camera. */
  externalRep: { exerciseId: string; count: number } | null;
  onExternalRepHandled: () => void;
}

export default function TownView({
  progress,
  repsToday,
  onRep,
  onCoach,
  externalRep,
  onExternalRepHandled,
}: TownViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<RendererState | null>(null);
  const townRef = useRef<TownModelRef | null>(null);
  const particles = useMemo(() => new Particles(), []);
  const labels = useMemo(() => new Labels(), []);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dailySet = useMemo(() => getDailySet(), []);
  const today = progress.days[0];

  // Rebuild the town from today's reps. Plots are keyed by daily-set index, so
  // an exercise always owns the same plot regardless of decoration placement.
  const town = useMemo(() => {
    const fills = new Map<number, number>();
    dailySet.forEach((exercise, i) => {
      const done = today?.reps[exercise.id] ?? 0;
      const goal = goalFor(exercise);
      fills.set(i, goal > 0 ? Math.min(1, done / goal) : 0);
    });
    return buildTown(SEED, fills, progress.currentStreak, dailySet.length);
  }, [dailySet, today, progress.currentStreak]);

  townRef.current = town;

  // Seed the renderer once, keeping fill targets in sync. Fill indices are
  // positional, so a change in plot count means a rebuild.
  const plotCount = town.plots.length;
  if (!stateRef.current || stateRef.current.fills.size !== plotCount) {
    stateRef.current = createRendererState(town);
  } else {
    setTargets(stateRef.current, town);
  }

  /** Positional plot index for a daily-set index, or null. */
  const plotIndexForExercise = useCallback(
    (exerciseIndex: number): number | null => {
      const i = town.plots.findIndex((plot) => plot.exerciseIndex === exerciseIndex);
      return i === -1 ? null : i;
    },
    [town],
  );

  /** Flash a plot and kick up particles. */
  const celebrate = useCallback(
    (plotIndex: number, hue: 'gold' | 'jade', text: string) => {
      const canvas = canvasRef.current;
      const model = townRef.current;
      const current = stateRef.current;
      const plot = model?.plots[plotIndex];
      if (!canvas || !plot || !current) return;
      const p = makeProjection(canvas);
      const anchor = project(p, plot.col, plot.row, 1.4);
      particles.burst(anchor.x, anchor.y, hue === 'gold' ? 16 : 14, hue);
      labels.add(anchor.x, anchor.y - 14, text, hue === 'gold' ? '#ffd98a' : '#96ebc8');
      bumpPop(current, plotIndex);
    },
    [particles, labels],
  );

  // Reps triggered outside the canvas still need the same celebration.
  useEffect(() => {
    if (!externalRep) return;
    const exerciseIndex = dailySet.findIndex((e) => e.id === externalRep.exerciseId);
    const plotIndex = plotIndexForExercise(exerciseIndex);
    if (exerciseIndex >= 0 && plotIndex !== null) {
      celebrate(plotIndex, 'jade', '+1');
      playRep(externalRep.count - 1);
    }
    onExternalRepHandled();
  }, [externalRep, dailySet, plotIndexForExercise, celebrate, onExternalRepHandled]);

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const current = stateRef.current;
    if (!current) return;

    let raf = 0;
    let last = performance.now();
    let running = true;

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      advance(current, dt);
      particles.update(dt);
      labels.update(dt);

      const p = makeProjection(canvas);
      drawScene(ctx, p, townRef.current ?? town, current, canvas.clientWidth, canvas.clientHeight);

      // Particles and labels live in screen space, so they draw last.
      particles.draw(ctx);
      labels.draw(ctx);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [town, particles, labels]);

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const current = stateRef.current;
    const model = townRef.current;
    if (!canvas || !current || !model) return;
    const rect = canvas.getBoundingClientRect();
    const idx = hitTest(makeProjection(canvas), model, e.clientX - rect.left, e.clientY - rect.top);
    current.hoverIndex = idx;
    setHoverIndex(idx);
  };

  const handleLeave = () => {
    const current = stateRef.current;
    if (current) current.hoverIndex = null;
    setHoverIndex(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const model = townRef.current;
    if (!canvas || !model) return;
    unlockAudio();

    const rect = canvas.getBoundingClientRect();
    const p = makeProjection(canvas);
    const idx = hitTest(p, model, e.clientX - rect.left, e.clientY - rect.top);
    const plot = idx === null ? null : (model.plots[idx] ?? null);
    if (!plot || plot.exerciseIndex < 0 || idx === null) return;

    const exercise = dailySet[plot.exerciseIndex];
    if (!exercise) return;
    setSelectedId(exercise.id);
    playTick();

    const done = today?.reps[exercise.id] ?? 0;
    const goal = goalFor(exercise);
    if (done >= goal) {
      // Already built. Celebrate the acknowledgement without faking a rep.
      celebrate(idx, 'jade', 'built');
      const top = project(p, plot.col, plot.row, 2.2);
      particles.rise(top.x, top.y, 20);
      playLevelUp();
      return;
    }

    celebrate(idx, 'gold', '+1');
    onRep(exercise.id);
    const after = done + 1;
    playRep(after - 1);
    if (after >= goal) playLevelUp();
  };

  const hoveredPlot = hoverIndex === null ? null : (town.plots[hoverIndex] ?? null);
  const hoveredExercise =
    hoveredPlot && hoveredPlot.exerciseIndex >= 0
      ? (dailySet[hoveredPlot.exerciseIndex] ?? null)
      : null;
  const hoveredCount = hoveredExercise ? (today?.reps[hoveredExercise.id] ?? 0) : 0;
  const hoveredGoal = hoveredExercise ? goalFor(hoveredExercise) : 0;
  const hoveredDone = hoveredCount >= hoveredGoal && hoveredGoal > 0;
  const selectedExercise = dailySet.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="town">
      <canvas
        ref={canvasRef}
        className="town__canvas"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onPointerDown={handlePointerDown}
        role="img"
        aria-label={`Your town. ${repsToday} reps today across ${dailySet.length} plots. ${progress.currentStreak} day streak.`}
      />

      {hoveredExercise && (
        <div className="town__tooltip" role="status">
          <span className="town__tooltip-name">{hoveredExercise.name}</span>
          <span className="town__tooltip-count">
            {hoveredCount}/{hoveredGoal}
            {hoveredDone ? ' built' : ''}
          </span>
        </div>
      )}

      {/* Streak and reps live in the strip below the diorama, so the canvas
          carries no duplicate HUD. Only the plot's own label sits in here. */}

      {selectedExercise && (
        <div className="town__sheet">
          <button
            className="town__sheet-close"
            onClick={() => setSelectedId(null)}
            aria-label="Close"
          >
            ×
          </button>
          <p className="town__sheet-name">{selectedExercise.name}</p>
          <p className="town__sheet-summary">{selectedExercise.summary}</p>
          <button className="town__sheet-coach" onClick={() => onCoach(selectedExercise)}>
            Coach this one
            <span>opens camera coaching</span>
          </button>
        </div>
      )}
    </div>
  );
}

type TownModelRef = ReturnType<typeof buildTown>;
