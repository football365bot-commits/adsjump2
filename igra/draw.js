import { player } from './player.js';
import { bullets } from './bullets.js';
import { platforms } from './platforms.js';
import { activeEnemies } from './enemies.js';
import { PLAYER_SIZE, BULLET_SIZE, PLATFORM_WIDTH, PLATFORM_HEIGHT } from './config.js';

export function draw(ctx, score, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // player
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x, canvas.height - player.y, PLAYER_SIZE, PLAYER_SIZE);

    // bullets
    ctx.fillStyle = '#ffff00';
    bullets.forEach(b => ctx.fillRect(b.x - BULLET_SIZE/2, canvas.height - b.y, BULLET_SIZE, BULLET_SIZE));

    // platforms
    platforms.forEach(p => {
        if (p.type === 'broken' && p.used) return;
        switch (p.type) {
            case 'normal': ctx.fillStyle = '#00ff88'; break;
            case 'broken': ctx.fillStyle = '#ff4444'; break;
            case 'moving_slow': ctx.fillStyle = '#00ffff'; break;
            case 'moving_fast': ctx.fillStyle = '#ff00ff'; break;
        }
        ctx.fillRect(p.x, canvas.height - p.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);
    });

    // enemies
    activeEnemies.forEach(e => {
        switch(e.type){
            case 'static': ctx.fillStyle='#ff0000'; break;
            case 'slow': ctx.fillStyle='#ff8800'; break;
            case 'fast': ctx.fillStyle='#ffff00'; break;
        }
        ctx.fillRect(e.x, canvas.height - e.y - e.size, e.size, e.size);
    });

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font='20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.fillText(`HP: ${player.hp}`, canvas.width - 100, 30);
}
