/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
}

export interface Rocket extends Entity {
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
}

export interface Interceptor extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  growthRate: number;
  isExpanding: boolean;
}

export interface City extends Entity {
  isDestroyed: boolean;
}

export interface Tower extends Entity {
  ammo: number;
  maxAmmo: number;
  isDestroyed: boolean;
}

export type GameState = 'START' | 'PLAYING' | 'WON' | 'LOST';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const WIN_SCORE = 1000;
export const POINTS_PER_KILL = 20;
