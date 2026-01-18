// =====================
// CONFIG
// =====================
export const GRAVITY = -0.6;
export const BASE_JUMP_FORCE = 15;
export const PLAYER_SIZE = 40;
export const PLATFORM_WIDTH = 65;
export const PLATFORM_HEIGHT = 15;
export const MIN_GAP = 120;
export const MAX_GAP = 160;
export const CAMERA_SPEED = 1.25;
export const BULLET_SPEED = 12;
export const BULLET_SIZE = 4;
export const FIRE_RATE = 150;

export const ENEMY_MAX = {
    static: { speed: 0, damage: 1, hp: 5 },
    slow:   { speed: 3, damage: 2, hp: 7 },
    fast:   { speed: 6, damage: 4, hp: 10 }
};
export const MAX_ENEMIES = 5;
