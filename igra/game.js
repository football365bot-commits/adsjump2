import { player, updatePlayer } from './player.js';
import { platforms, createStartPlatform, generateInitialPlatforms } from './platforms.js';
import { spawnEnemies, updateEnemies } from './enemies.js';
import { updateBullets } from './bullets.js';
import { draw } from './draw.js';
import { CAMERA_SPEED, PLAYER_SIZE } from './config.js';

let lastTime = 0;
let score = 0;

export function startGame(canvas, ctx) {
    player.x = canvas.width/2;
    player.y = canvas.height/3;

    createStartPlatform(canvas);
    generateInitialPlatforms(20, score, canvas);

    function gameLoop(t){
        const dt = t - lastTime;
        lastTime = t;

        updatePlayer();
        updateBullets(canvas, score);
        updateEnemies(dt);

        // камера и платформа
        if (player.y > canvas.height / 2) {
            const delta = (player.y - canvas.height / 2) * CAMERA_SPEED;
            player.y = canvas.height / 2;
            platforms.forEach(p => p.y -= delta);
            score += Math.floor(delta);
        }

        spawnEnemies(score);

        draw(ctx, score, canvas);

        if (player.hp <= 0 || player.y < -200) {
            alert('Game Over');
            location.reload();
        } else {
            requestAnimationFrame(gameLoop);
        }
    }

    requestAnimationFrame(gameLoop);
}
