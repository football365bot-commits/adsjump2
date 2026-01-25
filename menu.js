import { GameState } from './pause.js';

export class Menu {
    constructor(onStartGame) {
        this.onStartGame = onStartGame;
        this.buttons = [
            { text: 'Играть', x: 0, y: 0, w: 200, h: 50 } // координаты потом расставим
        ];
        this.visible = true;
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    draw(ctx, canvas) {
        if (!this.visible) return;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Главное Меню', canvas.width / 2, canvas.height / 3);

        this.buttons.forEach((b, i) => {
            b.x = canvas.width / 2 - b.w / 2;
            b.y = canvas.height / 2 + i * 80;
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, b.w, b.h);
            ctx.fillText(b.text, b.x + b.w / 2, b.y + 32);
        });
    }

    handleClick(x, y) {
        if (!this.visible) return false;

        for (const b of this.buttons) {
            if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
                // Кнопка Играть
                this.hide();
                this.onStartGame();
                return true;
            }
        }
        return false;
    }
}