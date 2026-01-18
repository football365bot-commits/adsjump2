import { BASE_JUMP_FORCE, PLAYER_SIZE } from './config.js';

export const player = {
    x: 0,
    y: 0,
    vy: 0,
    jumpForce: BASE_JUMP_FORCE,
    hp: 100
};

export let inputX = 0;

export function setupInput(canvas) {
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const x = e.touches[0].clientX;
        inputX = x < canvas.width / 2 ? -1 : 1;
    });
    canvas.addEventListener('touchend', e => { e.preventDefault(); inputX = 0; });
}

export function updatePlayer() {
    player.x += inputX * 8;
}
