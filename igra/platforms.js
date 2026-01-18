import { PLAYER_SIZE, PLATFORM_WIDTH, PLATFORM_HEIGHT, MIN_GAP, MAX_GAP } from './config.js';
import { player } from './player.js';
import { getItemForPlatform } from './items.js';

export const platforms = [];

export function createStartPlatform(canvas) {
    platforms.push({
        x: canvas.width / 2 - PLATFORM_WIDTH / 2,
        y: 50,
        type: 'normal',
        vx: 0,
        used: false,
        item: null,
        temp: true,
        lifeTime: 2000,
        spawnTime: performance.now()
    });
}

export function getPlatformTypeByScore(score) {
    const normalChance = Math.max(0.6 - score / 10000, 0.2);
    const brokenChance = Math.min(0.2 + score / 15000, 0.4);
    const movingSlowChance = Math.min(0.1 + score / 20000, 0.2);
    const movingFastChance = 1 - normalChance - brokenChance - movingSlowChance;

    const rand = Math.random();
    if (rand < normalChance) return 'normal';
    if (rand < normalChance + brokenChance) return 'broken';
    if (rand < normalChance + brokenChance + movingSlowChance) return 'moving_slow';
    return 'moving_fast';
}

export function generateInitialPlatforms(count, score, canvas) {
    let currentY = 100;
    for (let i = 0; i < count; i++) {
        const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
        const type = getPlatformTypeByScore(score);
        let vx = 0;
        if (type === 'moving_slow') vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'moving_fast') vx = Math.random() < 0.5 ? 3 : -3;
        const itemType = getItemForPlatform();
        platforms.push({
            x: Math.random() * (canvas.width - PLATFORM_WIDTH),
            y: currentY,
            type,
            vx,
            used: false,
            item: itemType
        });
        currentY += gap;
    }
}
