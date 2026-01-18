import { ENEMY_MAX, MAX_ENEMIES, PLAYER_SIZE } from './config.js';
import { player } from './player.js';
import { platforms } from './platforms.js';

export const activeEnemies = [];
export const inactiveEnemies = Array.from({ length: MAX_ENEMIES }, () => ({
    active: false,
    x: 0, y: 0, vx: 0, vy: 0,
    type: 'static', size: 30, width: 30, height: 30,
    hp: 0, maxHp: 0, damage: 0, lastShot: 0,
    bullets: []
}));

export function getEnemyTypeByScore(score) {
    const rand = Math.random();
    if (score < 5000) return rand < 0.7 ? 'static' : 'slow';
    if (score < 20000) return rand < 0.5 ? 'static' : rand < 0.85 ? 'slow' : 'fast';
    return rand < 0.3 ? 'static' : rand < 0.7 ? 'slow' : 'fast';
}

let lastEnemySpawn = 0;
export function spawnEnemies(score) {
    const now = performance.now();
    if (now - lastEnemySpawn < 300) return;
    lastEnemySpawn = now;

    const spawnChance = 0.002 + Math.min(score / 30000, 0.01);

    platforms.forEach(p => {
        if (p.y > player.y && Math.random() < spawnChance) {
            const enemy = inactiveEnemies.find(e => !e.active);
            if (!enemy) return;

            enemy.active = true;
            enemy.type = getEnemyTypeByScore(score);

            const offsetX = Math.random() * 30 * (Math.random() < 0.5 ? -1 : 1);
            const offsetY = Math.random() * 20 * (Math.random() < 0.5 ? -1 : 1);

            enemy.x = p.x + Math.random() * (30 - enemy.size) + offsetX;
            enemy.y = p.y + 15 + offsetY;

            if (enemy.type === 'slow') enemy.vx = (Math.random() < 0.5 ? 1 : -1) * (ENEMY_MAX['slow'].speed + score * 0.0001);
            else if (enemy.type === 'fast') enemy.vx = (Math.random() < 0.5 ? 1 : -1) * (ENEMY_MAX['fast'].speed + score * 0.0002);
            else enemy.vx = 0;
            enemy.vy = 0;

            enemy.hp = ENEMY_MAX[enemy.type].hp;
            enemy.maxHp = ENEMY_MAX[enemy.type].hp;
            enemy.damage = ENEMY_MAX[enemy.type].damage;
            enemy.lastShot = now;
            enemy.bullets = [];

            activeEnemies.push(enemy);
        }
    });
}

export function updateEnemies(dt) {
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const e = activeEnemies[i];

        const onScreen = e.y > player.y - 300 && e.y < player.y + 300;
        if (!onScreen) continue;

        e.x += e.vx;
        e.y += e.vy;

        if (e.vx !== 0) {
            if (e.x < 0) e.vx = Math.abs(e.vx);
            if (e.x + e.size > 600) e.vx = -Math.abs(e.vx);
        }

        // движение пуль врагов
        for (let j = e.bullets.length - 1; j >= 0; j--) {
            const b = e.bullets[j];
            b.x += b.vx;
            b.y += b.vy;

            if (b.x > player.x && b.x < player.x + PLAYER_SIZE &&
                b.y > player.y && b.y < player.y + PLAYER_SIZE) {
                player.hp -= b.damage;
                e.bullets.splice(j, 1);
                continue;
            }
        }
    }
}
