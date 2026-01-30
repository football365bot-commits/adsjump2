// pause.js

export const GameState = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

export class PauseUI {
    constructor(canvas, ctx, callbacks) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.callbacks = callbacks;

        // кнопка паузы в верхнем левом углу
        this.pauseButton = { x: 20, y: 20, w: 40, h: 40 };

        // кнопки для PAUSED и GAME_OVER
        this.buttons = {
            resume: { x: 0, y: 0, w: 200, h: 40 },
            restart: { x: 0, y: 0, w: 200, h: 40 }
        };

        this.pauseStart = 0;
    }

    draw(gameState, coins = 0) {
        if (gameState === GameState.PLAYING) this.drawPauseButton();
        if (gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) {
            this.drawOverlay(gameState, coins);
        }
    }

    drawPauseButton() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(this.pauseButton.x, this.pauseButton.y, this.pauseButton.w, this.pauseButton.h);
        ctx.fillRect(this.pauseButton.x + 10, this.pauseButton.y + 8, 6, 24);
        ctx.fillRect(this.pauseButton.x + 24, this.pauseButton.y + 8, 6, 24);
    }

    drawOverlay(gameState, coins) {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // затемнённый фон
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // бокс с кнопками
        const box = {
            w: 300,
            h: 180,
            x: canvas.width / 2 - 150,
            y: canvas.height / 2 - 90
        };

        ctx.fillStyle = '#222';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState === GameState.PAUSED ? 'ПАУЗА' : 'GAME OVER', canvas.width / 2, box.y + 40);

        if (gameState === GameState.GAME_OVER) {
            ctx.font = '18px Arial';
            ctx.fillText(`Монетки: ${coins.toFixed(2)}`, canvas.width / 2, box.y + 70);
        }

        // кнопки
        this.buttons.resume.x = box.x + 50;
        this.buttons.resume.y = box.y + 80;
        this.buttons.restart.x = box.x + 50;
        this.buttons.restart.y = box.y + 130;

        this.drawButton(this.buttons.resume, gameState === GameState.PAUSED ? 'Продолжить' : 'Играть');
        this.drawButton(this.buttons.restart, 'Рестарт');
    }

    drawButton(btn, text) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, btn.x + btn.w / 2, btn.y + 26);
    }

    handleClick(x, y, gameState) {
        // кнопка паузы
        if (gameState === GameState.PLAYING && this.isInside(x, y, this.pauseButton)) {
            this.pauseStart = Date.now();
            this.callbacks.onPause();
            return true;
        }

        // кнопка Resume / Play
        if (this.isInside(x, y, this.buttons.resume)) {
            if (gameState === GameState.PAUSED) this.callbacks.onResume();
            else if (gameState === GameState.GAME_OVER) this.callbacks.onRestart();
            return true;
        }

        // кнопка Restart
        if (this.isInside(x, y, this.buttons.restart)) {
            this.callbacks.onRestart();
            return true;
        }

        return false;
    }

    isInside(x, y, btn) {
        return x > btn.x && x < btn.x + btn.w && y > btn.y && y < btn.y + btn.h;
    }
}