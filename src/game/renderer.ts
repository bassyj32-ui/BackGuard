/**
 * The renderer. Paints the diorama every frame: sky, ground, roads, then all
 * geometry sorted back-to-front, then atmosphere.
 *
 * Nothing here is static. Windows flicker on their own cadence, chimney smoke
 * rises and dissipates, motes drift, and buildings ease upward when their fill
 * changes.
 */

import {
  LEVEL_H,
  TILE_H,
  TILE_W,
  clamp01,
  drawBox,
  drawColumn,
  drawGlow,
  drawRoof,
  drawShadow,
  easeOutBack,
  hash,
  lerp,
  project,
  tilePath,
  unproject,
  type Projection,
} from './iso';
import {
  GROUND,
  GRASS,
  GRID_RADIUS,
  LANTERN,
  MOSS,
  MOSS_DARK,
  MOTE,
  PLAYER_PLOT,
  PLOT,
  ROAD,
  ROOFS,
  SKY_HORIZON,
  SKY_MID,
  SKY_TOP,
  SMOKE,
  TRUNK,
  WALLS,
  WINDOW,
  WINDOW_GLOW,
} from './palette';
import type { Plot, TownModel } from './town';

/**
 * Heights in world levels. Kept low: taller buildings read as a solid wall of
 * blocks on a phone, which hides the plot you are tapping.
 */
const STAGE_HEIGHT = {
  bare: 0.06,
  seedling: 0.45,
  house: 1.05,
  tower: 1.75,
  landmark: 2.3,
} as const;

interface Drawable {
  key: number;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
}

export interface RendererState {
  /** Per-plot animated 0..1 fill, eased. */
  fills: Map<number, number>;
  /** Target fills, so we can ease toward them. */
  targets: Map<number, number>;
  /** Plot index currently hovered. */
  hoverIndex: number | null;
  /** Seconds since mount, for ambient motion. */
  time: number;
  /** Pop animation timer keyed by plot index, seconds remaining. */
  pops: Map<number, number>;
}

export function createRendererState(town: TownModel): RendererState {
  const fills = new Map<number, number>();
  const targets = new Map<number, number>();
  town.plots.forEach((plot, idx) => {
    fills.set(idx, plot.fill);
    targets.set(idx, plot.fill);
  });
  return { fills, targets, hoverIndex: null, time: 0, pops: new Map() };
}

export function setTargets(state: RendererState, town: TownModel): void {
  town.plots.forEach((plot, idx) => state.targets.set(idx, plot.fill));
}

export function bumpPop(state: RendererState, index: number): void {
  state.pops.set(index, 0.6);
}

/** Advance eased fills and decay pop timers. Called once per frame. */
export function advance(state: RendererState, dt: number): void {
  state.time += dt;
  for (const [idx, target] of state.targets) {
    const current = state.fills.get(idx) ?? 0;
    if (Math.abs(current - target) > 0.001) {
      // Ease toward target. Fast enough to feel responsive, slow enough to see.
      state.fills.set(idx, lerp(current, target, clamp01(dt * 4.5)));
    } else {
      state.fills.set(idx, target);
    }
  }
  for (const [idx, remaining] of state.pops) {
    const next = remaining - dt;
    if (next <= 0) state.pops.delete(idx);
    else state.pops.set(idx, next);
  }
}

/**
 * Fit the town to the canvas.
 *
 * The drawn bounds of a radius-R isometric diamond are R*TILE_W wide and
 * R*TILE_H tall in world units, plus the height of the tallest building on the
 * far edge. Fitting those directly is what keeps the diorama filling the frame
 * instead of floating in the top corner.
 */
export function makeProjection(canvas: HTMLCanvasElement): Projection {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Cells span +/-GRID_RADIUS on each axis, so the diamond's full extent is twice
  // the radius in both screen directions.
  const worldWidth = GRID_RADIUS * 2 * TILE_W;
  // Tallest possible silhouette: a landmark tower plus its roof, at the far edge.
  const worldHeight = GRID_RADIUS * 2 * TILE_H + (STAGE_HEIGHT.landmark + 0.5) * LEVEL_H;

  const scale = Math.min(
    (cssWidth - 12) / worldWidth,
    (cssHeight - 72) / worldHeight,
  );

  // `originY` is the screen position of grid cell (0, 0), which is the corner of
  // the diamond, not its centre. The player plot sits at the centre, so solve for
  // the origin that puts that cell where we want it. Treating the origin as the
  // centre pushed the whole town down and broke pointer hit-testing.
  const centreScreenY = cssHeight / 2 + 4;
  const offsetFromOrigin = (PLAYER_PLOT.col + PLAYER_PLOT.row) * (TILE_H / 2) * scale;
  return {
    originX: cssWidth / 2,
    originY: centreScreenY - offsetFromOrigin,
    scale: Math.max(0.4, scale),
  };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  town: TownModel,
  state: RendererState,
  width: number,
  height: number,
): void {
  drawSky(ctx, width, height, state.time);
  drawGroundPlane(ctx, p, state.time);

  const drawables: Drawable[] = [];

  // Roads and grass tiles go down first, back-to-front.
  const roadKeys = new Set(town.roads.map((r) => `${r.col},${r.row}`));
  for (let dcol = -GRID_RADIUS; dcol <= GRID_RADIUS; dcol++) {
    for (let drow = -GRID_RADIUS; drow <= GRID_RADIUS; drow++) {
      const col = PLAYER_PLOT.col + dcol;
      const row = PLAYER_PLOT.row + drow;
      const isRoad = roadKeys.has(`${col},${row}`);
      drawables.push({
        key: dcol + drow,
        draw: (c, t) => drawTile(c, p, col, row, isRoad, t),
      });
    }
  }

  // Player plot tile glows so the eye finds it immediately. Painted before
  // everything, so it reads as light on the ground rather than an overlay.
  drawPlayerGlow(ctx, p, state.time);

  town.trees.forEach((tree, i) => {
    drawables.push({
      key: tree.col - PLAYER_PLOT.col + (tree.row - PLAYER_PLOT.row) + 0.5,
      draw: (c, t) => drawTree(c, p, tree.col, tree.row, tree.scale, t, i),
    });
  });

  town.lamps.forEach((lamp, i) => {
    drawables.push({
      key: lamp.col - PLAYER_PLOT.col + (lamp.row - PLAYER_PLOT.row) + 0.6,
      draw: (c, t) => drawLamp(c, p, lamp.col, lamp.row, t, i),
    });
  });

  town.plots.forEach((plot, idx) => {
    const key = plot.col - PLAYER_PLOT.col + (plot.row - PLAYER_PLOT.row);
    drawables.push({
      key,
      draw: (c, t) => drawPlot(c, p, plot, state, idx, t),
    });
  });

  drawables.sort((a, b) => a.key - b.key);
  for (const d of drawables) d.draw(ctx, state.time);

  drawMotes(ctx, width, height, state.time);
  drawVignette(ctx, width, height);
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.55, SKY_MID);
  g.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // A few stars in the upper band, twinkling on independent phases.
  for (let i = 0; i < 26; i++) {
    const x = hash(i * 3.7) * w;
    const y = hash(i * 8.1) * h * 0.42;
    const twinkle = 0.35 + 0.35 * Math.sin(t * 1.1 + hash(i * 5.5) * Math.PI * 2);
    drawGlow(ctx, x, y, 1.1, '#fff6e0', twinkle);
  }
}

/** A soft light pool over the town, so the ground is not uniformly lit. */
function drawGroundPlane(ctx: CanvasRenderingContext2D, p: Projection, t: number): void {
  const c = project(p, PLAYER_PLOT.col, PLAYER_PLOT.row, 0);
  const radius = (GRID_RADIUS + 2) * TILE_W * p.scale;
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
  const pulse = 0.5 + 0.03 * Math.sin(t * 0.7);
  g.addColorStop(0, `rgba(120, 96, 190, ${0.16 * pulse})`);
  g.addColorStop(1, 'rgba(120, 96, 190, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4000, 4000);
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  isRoad: boolean,
  t: number,
): void {
  const jitter = hash(col * 12.9 + row * 78.2);
  const pal = isRoad ? ROAD : GRASS;
  const lift = jitter * 0.06;

  tilePath(ctx, p, col, row, 0);
  ctx.fillStyle = shade(pal.top, lift);
  ctx.fill();
  ctx.strokeStyle = GROUND.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Sparse decorative detail so the field is not a flat checkerboard.
  if (!isRoad && jitter > 0.86) {
    const c = project(p, col, row, 0);
    const bob = Math.sin(t * 1.4 + jitter * 20) * 0.6;
    ctx.fillStyle = MOSS_DARK;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + bob, 3 * p.scale, 2 * p.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayerGlow(ctx: CanvasRenderingContext2D, p: Projection, t: number): void {
  const c = project(p, PLAYER_PLOT.col, PLAYER_PLOT.row, 0);
  const pulse = 0.55 + 0.18 * Math.sin(t * 1.8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 46 * p.scale);
  g.addColorStop(0, `rgba(138, 123, 214, ${0.3 * pulse})`);
  g.addColorStop(1, 'rgba(138, 123, 214, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 46 * p.scale, 24 * p.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlot(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  plot: Plot,
  state: RendererState,
  idx: number,
  t: number,
): void {
  const fill = state.fills.get(idx) ?? plot.fill;
  const pop = state.pops.get(idx) ?? 0;
  const hover = state.hoverIndex === idx;
  const seed = idx * 4.37;

  // Foundation tile. Bare plots read as staked-out land.
  const foundation = plot.isPlayer ? PLOT.complete : PLOT.empty;
  tilePath(ctx, p, plot.col, plot.row, 0);
  ctx.fillStyle = plot.stage === 'bare' ? PLOT.empty : shade(foundation, fill * 0.12);
  ctx.fill();
  ctx.strokeStyle = plot.isPlayer ? 'rgba(240, 176, 96, 0.55)' : GROUND.line;
  ctx.lineWidth = plot.isPlayer ? 2 : 1;
  ctx.stroke();

  if (hover) {
    tilePath(ctx, p, plot.col, plot.row, 0.02);
    ctx.fillStyle = 'rgba(179, 164, 240, 0.16)';
    ctx.fill();
  }

  if (plot.stage === 'bare') {
    // A surveyor's stake on empty land.
    drawColumn(ctx, p, plot.col, plot.row, 0, 0.5, 1.2, 'rgba(180, 170, 210, 0.5)');
    return;
  }

  // Ease the height. Pop adds a bounce on top of the fill ease.
  const stageHeight = STAGE_HEIGHT[plot.stage];
  const stageFloor = stageFloorFor(plot.stage);
  let height = lerp(stageFloor, stageHeight, clamp01(fill * 2.2));
  if (plot.stage === 'seedling') height = STAGE_HEIGHT.seedling * (0.7 + fill);
  if (pop > 0) {
    const k = 1 - pop / 0.6;
    height *= 1 + easeOutBack(clamp01(k)) * 0.12;
  }

  drawShadow(ctx, p, plot.col, plot.row, TILE_W * 0.42, TILE_H * 0.42, 0.32);

  if (plot.stage === 'seedling') {
    drawSprout(ctx, p, plot.col, plot.row, t, seed);
    return;
  }

  const walls = WALLS[plot.wallIndex % WALLS.length] ?? WALLS[0];
  const roofs = ROOFS[plot.roofIndex % ROOFS.length] ?? ROOFS[0];
  drawBox(ctx, p, plot.col, plot.row, height, walls, 0.14);
  drawRoof(ctx, p, plot.col, plot.row, height, 0.42, roofs, 0.2);

  drawWindows(ctx, p, plot.col, plot.row, height, plot.windowsLit, t, seed);
  if (plot.hasSmoke) drawSmoke(ctx, p, plot.col, plot.row, height + 1.6, t, seed);
  if (plot.stage === 'landmark') drawBeacon(ctx, p, plot.col, plot.row, height + 2, t);
}

function stageFloorFor(stage: Plot['stage']): number {
  switch (stage) {
    case 'tower':
      return STAGE_HEIGHT.house;
    case 'landmark':
      return STAGE_HEIGHT.tower;
    default:
      return 0;
  }
}

/** Window grid on the two visible faces. Lit fraction follows fill. */
function drawWindows(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  height: number,
  lit: number,
  t: number,
  seed: number,
): void {
  if (height < 0.8) return;
  const s = p.scale;
  const rows = Math.max(1, Math.min(4, Math.floor(height * 1.6)));
  const cols = 2;
  const litCount = Math.round(clamp01(lit) * rows * cols);

  let placed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (placed >= litCount) return;
      const level = 0.28 + r * ((height - 0.5) / rows);
      const center = project(p, col, row, level);
      // Right face sits half a tile out; offset along the row axis.
      const offsetX = (c === 0 ? -1 : 1) * 7 * s;
      const x = center.x + offsetX * 0.6;
      const y = center.y + (c === 0 ? 1.5 : -1.5) * s + r * 0;

      // Independent flicker per window, slow and irregular.
      const flicker = 0.75 + 0.25 * Math.sin(t * 0.9 + seed + r * 1.7 + c * 0.6);
      // Glow is small and tight. A wide additive halo stacks with every window
      // and turns the facade into a pale smear.
      drawGlow(ctx, x, y, 3.4 * s, WINDOW_GLOW, 0.3 * flicker);
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.fillStyle = WINDOW;
      ctx.fillRect(x - 1.6 * s, y - 2.4 * s, 3.2 * s, 4 * s);
      ctx.restore();
      placed++;
    }
  }
}

/** Chimney smoke: stacked shrinking blobs rising and dissipating. */
function drawSmoke(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  level: number,
  t: number,
  seed: number,
): void {
  const origin = project(p, col, row, level);
  for (let i = 0; i < 5; i++) {
    const phase = (t * 0.35 + i * 0.2 + seed) % 1;
    const y = origin.y - phase * 46 * p.scale;
    const x = origin.x + Math.sin(phase * 5 + seed) * 6 * p.scale + phase * 10 * p.scale;
    const r = (3 + phase * 9) * p.scale;
    ctx.save();
    ctx.globalAlpha = (1 - phase) * 0.28;
    ctx.fillStyle = SMOKE;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** A slow beacon above completed plots. */
function drawBeacon(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  level: number,
  t: number,
): void {
  const c = project(p, col, row, level);
  const pulse = 0.4 + 0.35 * Math.sin(t * 2.2);
  drawGlow(ctx, c.x, c.y, 14 * p.scale, 'rgba(240, 176, 96, 0.5)', pulse);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#ffe9c2';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 2.4 * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSprout(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  t: number,
  seed: number,
): void {
  const sway = Math.sin(t * 1.1 + seed) * 0.08;
  const base = project(p, col, row, 0);
  const topY = base.y - 14 * p.scale;
  const tipX = base.x + Math.sin(sway) * 8 * p.scale;

  ctx.strokeStyle = TRUNK;
  ctx.lineWidth = 1.6 * p.scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(base.x, (base.y + topY) / 2, tipX, topY);
  ctx.stroke();

  ctx.fillStyle = MOSS;
  ctx.beginPath();
  ctx.ellipse(tipX - 3 * p.scale, topY, 4 * p.scale, 2.4 * p.scale, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(tipX + 3 * p.scale, topY + 2 * p.scale, 3.4 * p.scale, 2 * p.scale, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  scale: number,
  t: number,
  idx: number,
): void {
  const sway = Math.sin(t * 0.8 + idx) * 1.4 * p.scale;
  const trunkTop = drawColumn(ctx, p, col, row, 0, 0.55 * scale, 1.5, TRUNK);
  // Layered conifer. Round lollipops repeated across the map read as clip art,
  // so this is a stack of tapering tiers with a lit and a shaded side.
  const h = 1.9 * scale;
  const w = 8.5 * scale * p.scale;
  const tiers = 3;
  const baseY = trunkTop.y;
  const baseX = trunkTop.x + sway;

  drawShadow(ctx, p, col, row, 9 * scale, 4.5 * scale, 0.3);

  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const yTop = baseY - h * (1 - t * 0.62);
    const yBottom = baseY - h * (0.62 - t * 0.42);
    const halfW = w * (0.55 + t * 0.45);

    ctx.fillStyle = MOSS_DARK;
    ctx.beginPath();
    ctx.moveTo(baseX, yTop);
    ctx.lineTo(baseX + halfW, yBottom);
    ctx.lineTo(baseX, yBottom);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = MOSS;
    ctx.beginPath();
    ctx.moveTo(baseX, yTop);
    ctx.lineTo(baseX - halfW * 0.55, yBottom);
    ctx.lineTo(baseX, yBottom);
    ctx.closePath();
    ctx.fill();
  }
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  col: number,
  row: number,
  t: number,
  idx: number,
): void {
  const top = drawColumn(ctx, p, col, row, 0, 1.7, 1.1, '#3a3050');
  const flicker = 0.8 + 0.2 * Math.sin(t * 2.6 + idx * 1.9);
  // Tight halo. A wide additive glow at this size washes out as a pale disc
  // rather than reading as a lamp.
  drawGlow(ctx, top.x, top.y, 7 * p.scale, 'rgba(255, 179, 71, 0.3)', flicker);
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.fillStyle = LANTERN;
  ctx.beginPath();
  ctx.arc(top.x, top.y, 1.8 * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Dust motes drifting up through the light. */
function drawMotes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  for (let i = 0; i < 34; i++) {
    const seed = i * 2.71;
    const speed = 6 + hash(i * 4.1) * 14;
    const y = h - ((t * speed + hash(i) * h) % (h + 40));
    const x = (hash(i * 7.7) * w + Math.sin(t * 0.5 + seed) * 18) % w;
    const alpha = 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.3 + seed));
    drawGlow(ctx, x, y, 1.5, MOTE, alpha);
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(10, 6, 24, 0)');
  g.addColorStop(1, 'rgba(10, 6, 24, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Which plot is under the pointer, or null. */
export function hitTest(
  p: Projection,
  town: TownModel,
  x: number,
  y: number,
): number | null {
  const { col, row } = unproject(p, x, y);
  const c = Math.floor(col);
  const r = Math.floor(row);
  for (let i = 0; i < town.plots.length; i++) {
    if (town.plots[i]?.col === c && town.plots[i]?.row === r) return i;
  }
  return null;
}

/** Screen position of a plot's top, for anchoring HUD elements. */
export function plotAnchor(p: Projection, plot: Plot): { x: number; y: number } {
  return project(p, plot.col, plot.row, STAGE_HEIGHT[plot.stage] + 0.8);
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * (1 + amount)));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * (1 + amount)));
  const b = Math.min(255, Math.round((n & 255) * (1 + amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
