/**
 * Particle system for rep feedback. Pure data plus an update step; the renderer
 * draws it. Lives outside React so it can animate at frame rate without
 * triggering renders.
 */

import { hash } from './iso';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: 'gold' | 'jade' | 'violet';
}

export class Particles {
  private items: Particle[] = [];
  private counter = 0;

  /** Radial burst, used when a rep lands. */
  burst(x: number, y: number, count: number, hue: Particle['hue'] = 'gold'): void {
    for (let i = 0; i < count; i++) {
      const seed = this.counter++;
      const angle = hash(seed) * Math.PI * 2;
      const speed = 40 + hash(seed * 3.1) * 110;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0,
        maxLife: 0.55 + hash(seed * 7.3) * 0.4,
        size: 1.5 + hash(seed * 5.9) * 2.5,
        hue,
      });
    }
  }

  /** Upward column, used when a building gains a level. */
  rise(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const seed = this.counter++;
      this.items.push({
        x: x + (hash(seed) - 0.5) * 34,
        y: y + hash(seed * 2.2) * 10,
        vx: (hash(seed * 4.4) - 0.5) * 18,
        vy: -70 - hash(seed * 6.6) * 80,
        life: 0,
        maxLife: 0.8 + hash(seed * 8.8) * 0.5,
        size: 1.5 + hash(seed * 9.1) * 2,
        hue: 'jade',
      });
    }
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt; // gravity
      p.vx *= 0.99;
    }
    this.items = this.items.filter((p) => p.life < p.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.items.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const k = 1 - p.life / p.maxLife;
      const color = p.hue === 'gold' ? '255,207,135' : p.hue === 'jade' ? '150,235,200' : '179,164,240';
      ctx.globalAlpha = k * 0.9;
      ctx.fillStyle = `rgb(${color})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  get count(): number {
    return this.items.length;
  }
}

/** Floating "+1" style label that rises and fades. */
export interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export class Labels {
  private items: FloatingLabel[] = [];

  add(x: number, y: number, text: string, color = '#ffd98a'): void {
    this.items.push({ x, y, text, life: 0, maxLife: 1.1, color });
  }

  update(dt: number): void {
    for (const l of this.items) {
      l.life += dt;
      l.y -= 26 * dt;
    }
    this.items = this.items.filter((l) => l.life < l.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const l of this.items) {
      const k = 1 - l.life / l.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = l.color;
      ctx.font = '700 15px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.text, l.x, l.y);
      ctx.restore();
    }
  }

  get count(): number {
    return this.items.length;
  }
}
