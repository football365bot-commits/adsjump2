import { CONFIG, rand } from './config.js';
import { cameraY, gameState, setGameState } from './state.js';
import { GameState } from './pause.js';

export class Player {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.size = CONFIG.PLAYER_SIZE;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.hp = 100;
        this.skinCanvas = null;
        this.reset();
    }

    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 50;
        this.vy = 0;
        this.lastY = this.y;
        this.visualScale = 1;
    }

    prepareSkin(img) {
        const c = document.createElement('canvas');
        c.width = c.height = CONFIG.PLAYER_SIZE;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, c.width, c.height);
        this.skinCanvas = c;
    }

    update(inputX) {
        this.lastY = this.y;
        this.x += inputX * 11;
        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;
    }

    draw() {
        const ctx = this.ctx;
        ctx.drawImage(
            this.skinCanvas,
            this.x,
            this.y - cameraY,
            this.size,
            this.size
        );
    }
}

export class Enemy { /* ТВОЙ КОД БЕЗ ИЗМЕНЕНИЙ */ }
export class Platform { /* ТВОЙ КОД */ }
export class Item { /* ТВОЙ КОД */ }
export class BlackHole { /* ТВОЙ КОД */ }
