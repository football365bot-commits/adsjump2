import { startGame } from './game.js';
import { setupInput } from './player.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

setupInput(canvas);

startGame(canvas, ctx);
