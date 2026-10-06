/**
 * The town. A deterministic layout derived from a seed, with building heights
 * driven by progress. Same progress always yields the same town.
 *
 * Heights come from reps completed. A plot grows a tree while under-built, a
 * house once you have some reps, a tower once the daily set is done, and lights
 * its windows once the day is complete.
 */

import { GRID_RADIUS, PLAYER_PLOT } from './palette';
import { hash } from './iso';

export type PlotStage = 'bare' | 'seedling' | 'house' | 'tower' | 'landmark';

export interface Plot {
  col: number;
  row: number;
  /**
   * Index into the daily exercise set, or -1 for decorative plots. Necessary
   * because the plots array skips vegetation, so positional index does not line
   * up with exercise order.
   */
  exerciseIndex: number;
  /** 0..1 progress toward the next stage. */
  fill: number;
  stage: PlotStage;
  wallIndex: number;
  roofIndex: number;
  windowsLit: number;
  isPlayer: boolean;
  hasSmoke: boolean;
}

export interface Road {
  col: number;
  row: number;
}

export interface TownModel {
  plots: Plot[];
  roads: Road[];
  trees: Array<{ col: number; row: number; scale: number }>;
  lamps: Array<{ col: number; row: number }>;
}

/** Manhattan-distance test against the player plot. Arguments are offsets. */
function inRadius(dcol: number, drow: number, radius: number): boolean {
  // A square footprint reads as a town block far better than a diamond. A diamond
  // at this radius clipped the corner plots and left an empty wedge of land.
  return Math.max(Math.abs(dcol), Math.abs(drow)) <= radius;
}

/** Roads run along a cross and a ring, so plots are reachable and legible. */
function buildRoads(): Road[] {
  const roads: Road[] = [];
  const { col: pc, row: pr } = PLAYER_PLOT;
  for (let i = -GRID_RADIUS; i <= GRID_RADIUS; i++) {
    roads.push({ col: pc + i, row: pr });
    roads.push({ col: pc, row: pr + i });
  }
  for (let i = 1; i <= 3; i++) {
    roads.push({ col: pc + i, row: pr - i });
    roads.push({ col: pc - i, row: pr + i });
  }
  return roads;
}

export function stageFor(fill: number, dayComplete: boolean): PlotStage {
  if (dayComplete) return 'landmark';
  if (fill >= 0.66) return 'tower';
  if (fill >= 0.33) return 'house';
  if (fill > 0.04) return 'seedling';
  return 'bare';
}

/**
 * Cells reserved for the daily exercise set.
 *
 * These fill a ring around the player plot before expanding outward. An earlier
 * version walked the road axes instead, which pushed the first exercise's plot to
 * the far right edge of the board where it was hard to see and harder to tap.
 */
function exerciseCells(count: number): Array<{ col: number; row: number }> {
  const { col: pc, row: pr } = PLAYER_PLOT;
  const out: Array<{ col: number; row: number }> = [];
  const seen = new Set(['0,0']);

  for (let d = 1; d <= GRID_RADIUS && out.length < count; d++) {
    // Walk the ring at this radius, so plots appear evenly around the player.
    for (let dc = -d; dc <= d && out.length < count; dc++) {
      const candidates = [
        { dc, dr: d - Math.abs(dc) },
        { dc, dr: -(d - Math.abs(dc)) },
      ];
      for (const { dc: x, dr: y } of candidates) {
        if (Math.abs(x) + Math.abs(y) !== d) continue;
        const key = `${x},${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ col: pc + x, row: pr + y });
        if (out.length >= count) break;
      }
    }
  }
  return out;
}

/**
 * `fills` is keyed by daily-set index, so exercise plots always map to the same
 * exercises regardless of how decorative plots are interleaved.
 *
 * Decorative plots represent the town you already live in, so they start built.
 * Only your own plots start as bare staked land.
 */
export function buildTown(
  seed: number,
  fills: Map<number, number>,
  daysComplete: number,
  exerciseCount: number,
): TownModel {
  const plots: Plot[] = [];
  const trees: TownModel['trees'] = [];
  const lamps: TownModel['lamps'] = [];
  const { col: pc, row: pr } = PLAYER_PLOT;

  const reserved = new Map<string, number>();
  exerciseCells(exerciseCount).forEach((cell, i) => {
    reserved.set(`${cell.col - pc},${cell.row - pr}`, i);
  });

  const ordered: Array<{ dcol: number; drow: number }> = [];
  for (let dcol = -GRID_RADIUS; dcol <= GRID_RADIUS; dcol++) {
    for (let drow = -GRID_RADIUS; drow <= GRID_RADIUS; drow++) {
      if (!inRadius(dcol, drow, GRID_RADIUS)) continue;
      ordered.push({ dcol, drow });
    }
  }

  for (const { dcol, drow } of ordered) {
    const col = pc + dcol;
    const row = pr + drow;
    const idx = plots.length + trees.length;
    const roll = hash(seed + idx * 7.13);
    const key = `${dcol},${drow}`;

    if (reserved.has(key)) {
      const exerciseIndex = reserved.get(key) ?? 0;
      const fill = fills.get(exerciseIndex) ?? 0;
      plots.push(makePlot(seed, idx, col, row, fill, fill >= 1, exerciseIndex, true));
      continue;
    }

    // A small amount of open land, so the town has breathing room.
    if (roll > 0.88) {
      trees.push({ col, row, scale: 0.8 + hash(seed + idx * 3.1) * 0.5 });
      continue;
    }

    // Neighbours are already built. Kept mostly low so the player's own plots,
    // which grow taller, still read as the tallest things on the board.
    const maturity = Math.min(1, 0.4 + daysComplete / 40);
    const fill = 0.3 + hash(seed + idx * 2.7) * 0.32 * maturity;
    plots.push(makePlot(seed, idx, col, row, fill, false, -1, false));
  }

  // Street lamps along the roads, plus one on the player's plot.
  for (let d = 2; d <= GRID_RADIUS; d += 2) {
    lamps.push({ col: pc + d, row: pr });
    lamps.push({ col: pc, row: pr + d });
  }

  return { plots, roads: buildRoads(), trees, lamps };
}

function makePlot(
  seed: number,
  idx: number,
  col: number,
  row: number,
  fill: number,
  dayComplete: boolean,
  exerciseIndex: number,
  isPlayer: boolean,
): Plot {
  return {
    col,
    row,
    exerciseIndex,
    fill,
    stage: stageFor(fill, dayComplete),
    wallIndex: Math.floor(hash(seed + idx * 1.7) * 6) % 6,
    roofIndex: Math.floor(hash(seed + idx * 5.3) * 5) % 5,
    windowsLit: Math.min(1, fill * 1.15),
    isPlayer,
    hasSmoke: fill > 0.4 && hash(seed + idx * 11.7) > 0.45,
  };
}
