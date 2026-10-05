import { useMemo } from 'react';
import type { Progress } from '../state/progress';

const GRID_SIZE = 6;
const TILE_WIDTH = 84;
const TILE_HEIGHT = 42;
const MAX_LEVELS = 6;

const BASE = { r: 56, g: 189, b: 248 } as const;
const COMPLETE = { r: 251, g: 191, b: 36 } as const;

interface ProgressProps {
  progress: Progress;
  onBack: () => void;
}

/**
 * Reps raise blocks. A finished daily set fills the tile gold. Driven purely by
 * stored counts, never by pose data.
 */
export default function ProgressScreen({ progress, onBack }: ProgressProps) {
  const canvasRef = useMemo(
    () => ({ current: null as HTMLCanvasElement | null }),
    [],
  );

  const today = progress.days.find((d) => d.date === todayIso());
  const totalRepsToday = today ? Object.values(today.reps).reduce((a, b) => a + b, 0) : 0;

  // Flatten today's per-exercise reps into one block height, capped.
  const level = Math.min(MAX_LEVELS, Math.ceil(totalRepsToday / 8));

  return (
    <div className="screen">
      <header className="screen__header">
        <button className="button button--quiet" onClick={onBack}>
          Back
        </button>
        <h1 className="screen__title">Your grid</h1>
        <p className="screen__lede">
          Each block is roughly eight reps. Filling the tile means you finished the set.
        </p>
      </header>

      <div className="grid-stage">
        <canvas
          ref={(el) => {
            canvasRef.current = el;
            if (el) drawGrid(el, level, today?.dayComplete ?? false);
          }}
          className="grid-canvas"
          role="img"
          aria-label={`Today's progress: ${totalRepsToday} reps, ${level} blocks${
            today?.dayComplete ? ', day complete' : ''
          }`}
        />
      </div>

      <section className="stat-row" aria-label="Streaks">
        <div className="stat">
          <span className="stat__value">{progress.currentStreak}</span>
          <span className="stat__label">day streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{progress.longestStreak}</span>
          <span className="stat__label">best</span>
        </div>
      </section>

      <h2 className="section-heading">Recent days</h2>
      {progress.days.length === 0 ? (
        <p className="section-note">Nothing recorded yet. Finish one exercise to start your grid.</p>
      ) : (
        <ul className="day-list">
          {progress.days.slice(0, 7).map((day) => (
            <li key={day.date} className="day-row">
              <span className="day-row__date">{day.date}</span>
              <span className="day-row__reps">
                {Object.values(day.reps).reduce((a, b) => a + b, 0)} reps
              </span>
              <span className={`day-row__flag${day.dayComplete ? ' day-row__flag--done' : ''}`}>
                {day.dayComplete ? 'complete' : 'partial'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function drawGrid(canvas: HTMLCanvasElement, level: number, complete: boolean) {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.min(canvas.clientWidth || 320, 420);
  const height = 240;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const originX = width / 2;
  const originY = height / 2.4;

  // Painter's algorithm: rows outer, columns inner, blocks stacked ground-up so
  // nearer tiles overdraw farther ones.
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const isTodayTile = r === 0 && c === 0;
      drawTile(ctx, originX, originY, r, c, isTodayTile ? level : 0, isTodayTile && complete);
    }
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  row: number,
  col: number,
  heightLevel: number,
  complete: boolean,
) {
  const x = originX + (col - row) * (TILE_WIDTH / 2);
  const y = originY + (col + row) * (TILE_HEIGHT / 2);

  const base = complete ? COMPLETE : BASE;
  const shade = Math.max(0.45, 1 - heightLevel * 0.11);
  const r = Math.round(base.r * shade);
  const g = Math.round(base.g * shade);
  const b = Math.round(base.b * shade);

  const top = `rgb(${r}, ${g}, ${b})`;
  const left = `rgb(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)})`;
  const right = `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)})`;
  const stroke = 'rgba(255, 255, 255, 0.16)';

  // Ground plate.
  face(ctx, x, y, top, stroke);

  // Stacked levels, each offset upward.
  for (let h = 1; h <= heightLevel; h++) {
    const topY = y - h * 26;
    face(ctx, x, topY, top, stroke);
    wall(ctx, x, topY, left, stroke, 'left');
    wall(ctx, x, topY, right, stroke, 'right');
  }
}

function face(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, stroke: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
  ctx.lineTo(x, y + TILE_HEIGHT);
  ctx.lineTo(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function wall(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  fill: string,
  stroke: string,
  side: 'left' | 'right',
) {
  const baseY = topY + 26;
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (side === 'left') {
    ctx.moveTo(x - TILE_WIDTH / 2, topY + TILE_HEIGHT / 2);
    ctx.lineTo(x, topY + TILE_HEIGHT);
    ctx.lineTo(x, baseY + TILE_HEIGHT);
    ctx.lineTo(x - TILE_WIDTH / 2, baseY + TILE_HEIGHT / 2);
  } else {
    ctx.moveTo(x, topY + TILE_HEIGHT);
    ctx.lineTo(x + TILE_WIDTH / 2, topY + TILE_HEIGHT / 2);
    ctx.lineTo(x + TILE_WIDTH / 2, baseY + TILE_HEIGHT / 2);
    ctx.lineTo(x, baseY + TILE_HEIGHT);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}