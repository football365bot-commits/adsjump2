export const CONFIG = {
    GRAVITY: 0.8,
    BASE_JUMP_FORCE: 13.5,
    PLAYER_SIZE: 40,
    PLATFORM_WIDTH: 50,
    PLATFORM_HEIGHT: 12,
    MIN_GAP: 85,
    MAX_GAP: 100,
    MAX_PLATFORMS: 18,
    ENEMY_SIZE: 30,
    MAX_ENEMIES: 5,
    MAX_ITEMS: 7,

    ENEMY_SPAWN_CHANCE: 0.00005,
    ENEMY_SHOOT_INTERVAL: 25,
    ENEMY_DAMAGE: 1,
    ENEMY_HP: 10,

    PLAYER_BULLET_DAMAGE: 1,
    PLAYER_SHOOT_COOLDOWN: 15,

    BULLET_POOL_SIZE: 500,
    BULLET_SPEED: 13,
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
