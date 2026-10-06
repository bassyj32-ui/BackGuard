/**
 * Isometric projection and painting primitives.
 *
 * True isometric uses a 2:1 tile ratio. We project world grid coordinates
 * (col, row, level) to screen space, then paint primitives back-to-front so
 * nearer geometry overdraws farther geometry.
 */

export const TILE_W = 64;
export const TILE_H = 32;
export const LEVEL_H = 22;

export interface Pt {
  x: number;
  y: number;
}

export interface Projection {
  originX: number;
  originY: number;
  scale: number;
}

export function project(p: Projection, col: number, row: number, level = 0): Pt {
  const s = p.scale;
  return {
    x: p.originX + (col - row) * (TILE_W / 2) * s,
    y: p.originY + (col + row) * (TILE_H / 2) * s - level * LEVEL_H * s,
  };
}

/**
 * Inverse of `project` for a point at level 0. Returns fractional grid
 * coordinates; callers floor to get a cell index.
 *
 * Kept as the exact algebraic inverse of the forward transform rather than a
 * re-derived approximation, because a mismatch here silently breaks every
 * pointer interaction in the app.
 */
export function unproject(p: Projection, x: number, y: number): { col: number; row: number } {
  const s = p.scale;
  const dx = (x - p.originX) / s;
  const dy = (y - p.originY) / s;
  return {
    col: (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2,
    row: (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2,
  };
}

/** Flat diamond for a tile's top surface at the given level. */
export function tilePath(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  level: number,
): void {
  const c = project(p, col, row, level);
  const hw = (TILE_W / 2) * p.scale;
  const hh = (TILE_H / 2) * p.scale;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - hh);
  ctx.lineTo(c.x + hw, c.y);
  ctx.lineTo(c.x, c.y + hh);
  ctx.lineTo(c.x - hw, c.y);
  ctx.closePath();
}

/**
 * A box standing on a tile. Paints the two visible side faces then the top, so
 * the top edge reads cleanly.
 *
 * `inset` shrinks the footprint horizontally. Buildings that fill their tile edge
 * to edge fuse into a single mass with no ground showing between them, which is
 * what made an earlier version look like a tray of blocks rather than a town.
 */
export function drawBox(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  height: number,
  palette: BoxPalette,
  inset = 0,
): void {
  if (height <= 0) return;
  const s = p.scale;
  const base = project(p, col, row, 0);
  const top = project(p, col, row, height);
  const hw = (TILE_W / 2) * s * (1 - inset);
  const hh = (TILE_H / 2) * s * (1 - inset);

  // Left face (south-west facing).
  ctx.fillStyle = palette.left;
  ctx.beginPath();
  ctx.moveTo(base.x - hw, base.y);
  ctx.lineTo(base.x, base.y + hh);
  ctx.lineTo(top.x, top.y + hh);
  ctx.lineTo(top.x - hw, top.y);
  ctx.closePath();
  ctx.fill();

  // Right face (south-east facing).
  ctx.fillStyle = palette.right;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y + hh);
  ctx.lineTo(base.x + hw, base.y);
  ctx.lineTo(top.x + hw, top.y);
  ctx.lineTo(top.x, top.y + hh);
  ctx.closePath();
  ctx.fill();

  // Top face.
  ctx.fillStyle = palette.top;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y - hh);
  ctx.lineTo(top.x + hw, top.y);
  ctx.lineTo(top.x, top.y + hh);
  ctx.lineTo(top.x - hw, top.y);
  ctx.closePath();
  ctx.fill();
}

export interface BoxPalette {
  top: string;
  left: string;
  right: string;
}

/**
 * Gabled roof sitting on top of a box of the given height. `ridgeAxis` picks
 * which diagonal the ridge runs along.
 */
export function drawRoof(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  height: number,
  rise: number,
  palette: BoxPalette,
  inset = 0,
): void {
  const s = p.scale;
  const base = project(p, col, row, height);
  const apex = project(p, col, row, height + rise);
  const hw = (TILE_W / 2) * s * (1 - inset);
  const hh = (TILE_H / 2) * s * (1 - inset);

  // Gable ends plus two sloping faces.
  ctx.fillStyle = palette.left;
  ctx.beginPath();
  ctx.moveTo(base.x - hw, base.y);
  ctx.lineTo(base.x, base.y + hh);
  ctx.lineTo(apex.x, apex.y + hh);
  ctx.lineTo(apex.x - hw, apex.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.right;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y + hh);
  ctx.lineTo(base.x + hw, base.y);
  ctx.lineTo(apex.x + hw, apex.y);
  ctx.lineTo(apex.x, apex.y + hh);
  ctx.closePath();
  ctx.fill();

  // Ridge highlight.
  ctx.strokeStyle = palette.top;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(apex.x - hw, apex.y);
  ctx.lineTo(apex.x, apex.y + hh);
  ctx.lineTo(apex.x + hw, apex.y);
  ctx.stroke();
}

/** Soft elliptical contact shadow, used to seat objects on the ground. */
export function drawShadow(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  radiusX: number,
  radiusY: number,
  alpha: number,
): void {
  const c = project(p, col, row, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1a1030';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, radiusX * p.scale, radiusY * p.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A slender vertical form: lamp posts, tree trunks, chimneys. */
export function drawColumn(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  baseLevel: number,
  height: number,
  width: number,
  fill: string,
): Pt {
  const s = p.scale;
  const base = project(p, col, row, baseLevel);
  const top = project(p, col, row, baseLevel + height);
  const w = width * s;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(base.x - w, base.y);
  ctx.lineTo(base.x + w, base.y);
  ctx.lineTo(top.x + w, top.y);
  ctx.lineTo(top.x - w, top.y);
  ctx.closePath();
  ctx.fill();
  return top;
}

/** Circle that ignores the projection, for glows, windows and particles. */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Depth key for painter's-algorithm ordering. Larger key means nearer to the
 * camera, so paint ascending.
 */
export function depthKey(col: number, row: number, level = 0): number {
  return col + row + level * 0.0001;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Eases a growing building into place with a little overshoot. */
export function easeOutBack(t: number, overshoot = 1.7): number {
  const c3 = overshoot + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + overshoot * x * x;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Deterministic hash-based pseudo-random, so the city is stable across reloads. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
