export class Menu {
    constructor(callbacks = {}) {
        // callbacks — объект с функциями для каждой кнопки
        this.callbacks = {
            jump: callbacks.jump || (() => {}),
            inventory: callbacks.inventory || (() => {}),
            shop: callbacks.shop || (() => {}),
            achievements: callbacks.achievements || (() => {}),
            settings: callbacks.settings || (() => {}),
            leaderboard: callbacks.leaderboard || (() => {}),
        };

        this.buttons = [
            { text: 'Jump', callback: this.callbacks.jump },
            { text: 'Инвентарь', callback: this.callbacks.inventory },
            { text: 'Магазин', callback: this.callbacks.shop },
            { text: 'Достижения', callback: this.callbacks.achievements },
            { text: 'Настройки', callback: this.callbacks.settings },
            { text: 'Рейтинг', callback: this.callbacks.leaderboard },
        ];

        this.buttonWidth = 200;
        this.buttonHeight = 50;
        this.buttonGap = 20; // расстояние между кнопками
        this.leftMargin = 50; // отступ от левого края
    }

    draw(ctx, canvas, playerImage = null) {
        // Фон
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Заголовок
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Главное Меню', this.leftMargin, 80);

        // Кнопки
        this.buttons.forEach((b, i) => {
            b.x = this.leftMargin;
            b.y = 120 + i * (this.buttonHeight + this.buttonGap);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, this.buttonWidth, this.buttonHeight);

            ctx.fillStyle = '#fff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(b.text, b.x + this.buttonWidth / 2, b.y + this.buttonHeight / 2 + 8);
        });

        // Правая часть — визуализация игрока (если передан)
        if (playerImage) {
            const playerX = canvas.width / 2 + 50;
            const playerY = canvas.height / 2 - playerImage.height / 2;
            ctx.drawImage(playerImage, playerX, playerY);
        }
    }

    handleClick(x, y) {
        for (const b of this.buttons) {
            if (x > b.x && x < b.x + this.buttonWidth &&
                y > b.y && y < b.y + this.buttonHeight) {
                b.callback(); // вызываем callback кнопки
                return true;
            }
        }
        return false;
    }
}