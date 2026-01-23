// pause.js

export const GameState = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    MENU: 'menu',
    GAME_OVER: 'game_over'
};

export class PauseUI {
    constructor(canvas, ctx, callbacks) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.callbacks = callbacks;

        // кнопка паузы в верхнем левом углу
        this.pauseButton = { x: 20, y: 20, w: 40, h: 40 };
        this.pauseStart = 0;

        // одна и та же пара кнопок для PAUSED и GAME_OVER
        this.buttons = {
            resume: { x: 0, y: 0, w: 200, h: 40 },
            menu: { x: 0, y: 0, w: 200, h: 40 }
        };
    }

    draw(gameState) {
        if (gameState === GameState.PLAYING) {
            this.drawPauseButton();
        }

        if (gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) {
            this.drawOverlay(gameState);
        }
    }

    drawPauseButton() {
        const { ctx } = this;
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(this.pauseButton.x, this.pauseButton.y, this.pauseButton.w, this.pauseButton.h);

        ctx.fillRect(this.pauseButton.x + 10, this.pauseButton.y + 8, 6, 24);
        ctx.fillRect(this.pauseButton.x + 24, this.pauseButton.y + 8, 6, 24);
    }

    drawOverlay(gameState) {
        const { ctx, canvas } = this;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const box = {
            w: 300,
            h: 220,
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 - 110
        };

        ctx.fillStyle = '#222';
        ctx.fillRect(box.x, box.y, box.w, box.h);

        ctx.strokeStyle = '#fff';
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        const title = gameState === GameState.PAUSED ? 'ПАУЗА' : 'GAME OVER';
        ctx.fillText(title, canvas.width / 2, box.y + 40);

        this.drawButtons(box, gameState);
    }

    drawButtons(box, gameState) {
        this.buttons.resume.x = box.x + 50;
        this.buttons.resume.y = box.y + 80;

        this.buttons.menu.x = box.x + 50;
        this.buttons.menu.y = box.y + 140;

        const resumeText = gameState === GameState.PAUSED ? 'Продолжить' : 'Играть';

        this.drawButton(this.buttons.resume, resumeText);
        this.drawButton(this.buttons.menu, 'Меню');
    }

    drawButton(btn, text) {
        const { ctx } = this;

        ctx.strokeStyle = '#fff';
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, btn.x + btn.w / 2, btn.y + 26);
    }

    handleClick(x, y, gameState) {
        // Кнопка паузы
        if (gameState === GameState.PLAYING && this.isInside(x, y, this.pauseButton)) {
            this.pauseStart = Date.now();
            this.callbacks.onPause();
            return true;
        }

        // Кнопки PAUSED и GAME_OVER
        if (gameState === GameState.PAUSED) {
            if (this.isInside(x, y, this.buttons.resume)) {
                this.callbacks.onResume(Date.now() - this.pauseStart);
                return true;
            }
        } else if (gameState === GameState.GAME_OVER) {
            if (this.isInside(x, y, this.buttons.resume)) {
                this.callbacks.onRestart();
                return true;
            }
        }

        if (this.isInside(x, y, this.buttons.menu)) {
            this.callbacks.onMenu();
            return true;
        }

        return false;
    }

    isInside(x, y, b) {
        return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
    }
}