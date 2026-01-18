import { BULLET_SPEED, BULLET_SIZE } from './config.js';
import { player } from './player.js';
import { activeEnemies } from './enemies.js';

export const bullets = [];
export let lastShotTime = 0;

export function updateBullets(canvas, score) {
    // движение пуль игрока
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y += b.vy;
        if (b.y > canvas.height + 100 || b.y < -100) bullets.splice(i, 1);
    }

    // проверка попаданий по врагам
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let j = activeEnemies.length - 1; j >= 0; j--) {
            const e = activeEnemies[j];
            if (b.x > e.x && b.x < e.x + e.width &&
                b.y > e.y && b.y < e.y + e.height) {
                e.hp -= 10;
                bullets.splice(i, 1);
                if (e.hp <= 0) {
                    e.active = false;
                    activeEnemies.splice(j, 1);
                }
                break;
            }
        }
    }
}
