export class Menu {
    constructor(onStartGame) {
        this.onStartGame = onStartGame;

        // Кнопки слева с коллбеками
        this.buttons = [
            { text: 'Jump', callback: this.onStartGame },
            { text: 'Инвентарь', callback: () => console.log('Инвентарь') },
            { text: 'Магазин', callback: () => console.log('Магазин') },
            { text: 'Достижения', callback: () => console.log('Достижения') },
            { text: 'Настройки', callback: () => console.log('Настройки') },
            { text: 'Рейтинг', callback: () => console.log('Рейтинг') }
        ];

        this.buttonWidth = 120;
        this.buttonHeight = 30;
        this.buttonGap = 25;
        this.startX = 15; // отступ слева
        this.startY = null;
    }

    draw(ctx, canvas, player) {
        // === фон ===
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const totalHeight = this.buttons.length * this.buttonHeight + (this.buttons.length - 1) * this.buttonGap;
        this.startY = (canvas.height / 2) - (totalHeight / 2);

        // === кнопки слева ===
        this.buttons.forEach((b, i) => {
            b.x = this.startX;
            b.y = this.startY + i * (this.buttonHeight + this.buttonGap);
            b.w = this.buttonWidth;
            b.h = this.buttonHeight;

            // рамка кнопки
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // текст кнопки
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2);
        });

        // === крупный игрок справа ===

        if (player && player.menuSkinCanvas) {
            const px = canvas.width * 0.625;
            const py = canvas.height / 2;

            // используем канвас самого игрока, уже с динамическим размером
            const menuSize = player.menuSkinCanvas.width; // теперь это универсальный размер

                ctx.save();
                ctx.translate(px, py);
                ctx.drawImage(
                    player.menuSkinCanvas,
                    -menuSize / 2,
                    -menuSize / 2,
                    menuSize,
                    menuSize
            );
            ctx.restore();
        }
    }

    handleClick(x, y) {
        for (const b of this.buttons) {
            if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
                b.callback();
                return true;
            }
        }
        return false;
    }
}