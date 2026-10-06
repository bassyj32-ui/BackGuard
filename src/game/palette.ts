/**
 * Dusk-diorama palette and scene mood.
 *
 * Cool violet-indigo ground and sky, warm amber as the single light source. The
 * contrast between the cool ambient and warm points of light is what makes the
 * town read as evening rather than as a flat vector diagram.
 */

export const SKY_TOP = '#150e2e';
export const SKY_MID = '#241a4a';
export const SKY_HORIZON = '#3d2a5c';

export const GROUND = {
  top: '#4a3a6b',
  left: '#33254d',
  right: '#3b2b57',
  line: 'rgba(20, 12, 40, 0.35)',
} as const;

/**
 * Ground planes are close in value to the sky so the town reads as a lit diorama
 * rather than a bright green board. The old grass value was far too saturated
 * and light, which flattened everything in front of it.
 */
export const GRASS = {
  top: '#39456b',
  left: '#2b3452',
  right: '#323c5e',
} as const;

export const ROAD = {
  top: '#4a4470',
  left: '#38325a',
  right: '#413a65',
} as const;

export const PLOT = {
  empty: '#5c6b8a',
  built: '#8a7bd6',
  complete: '#f0b060',
} as const;

/** Wall colours per building family. Each has top/left/right shading. */
export const WALLS = [
  { top: '#6f5b9c', left: '#463762', right: '#56447a' },
  { top: '#5c6f9e', left: '#3a4468', right: '#47537c' },
  { top: '#8a5f7d', left: '#573c53', right: '#6b4862' },
  { top: '#4f7a8c', left: '#32505d', right: '#3d6270' },
  { top: '#96724e', left: '#5f4830', right: '#74573a' },
  { top: '#63617f', left: '#3f3e57', right: '#4d4c66' },
] as const;

export const ROOFS = [
  { top: '#c96f5a', left: '#8a4438', right: '#a55345' },
  { top: '#4f6b8c', left: '#33455c', right: '#3f536b' },
  { top: '#7a5f8c', left: '#4d3a5c', right: '#5f4a6b' },
  { top: '#a06a4a', left: '#6b4530', right: '#82553b' },
  { top: '#557a63', left: '#37503f', right: '#43614c' },
] as const;

/** Lit windows. Amber, warm. The only saturated warm in the scene. */
export const WINDOW = '#ffcf87';
export const WINDOW_GLOW = 'rgba(255, 190, 110, 0.16)';
export const LANTERN = '#ffb347';
export const MOTE = 'rgba(255, 214, 160, 0.5)';

export const MOSS = '#6f9c7d';
export const MOSS_DARK = '#4a6f56';
export const TRUNK = '#4a3a52';
export const SMOKE = 'rgba(210, 200, 220, 0.16)';

export const UI = {
  bg: '#150e2e',
  panel: 'rgba(28, 20, 54, 0.92)',
  panelBorder: 'rgba(150, 130, 220, 0.18)',
  text: '#f2eefb',
  textDim: '#a99fd0',
  accent: '#8a7bd6',
  accentBright: '#b3a4f0',
  gold: '#f0b060',
  jade: '#6fbf9a',
  danger: '#f0808c',
} as const;

/**
 * The player's plot sits at grid origin. Everything else radiates out from it.
 * Kept separate from the layout hash so the town composition is deliberate.
 */
export const PLAYER_PLOT = { col: 4, row: 4 };

/**
 * A 7x7 diamond. Radius 4 left a wide ring of empty tiles around the town, which
 * shrank the buildings and wasted most of the frame. Seven cells across holds all
 * seven exercises plus their neighbours at a readable size on a phone.
 */
export const GRID_RADIUS = 3;
