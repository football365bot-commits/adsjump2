export class Menu {
    constructor(onStartGame) {
        this.onStartGame = onStartGame;

        // Кнопки слева с коллбеками
        this.buttons = [
            { text: 'Jump', callback: this.onStartGame },           // запускает игру
            { text: 'Инвентарь', callback: () => console.log('Инвентарь') },
            { text: 'Магазин', callback: () => console.log('Магазин') },
            { text: 'Достижения', callback: () => console.log('Достижения') },
            { text: 'Настройки', callback: () => console.log('Настройки') },
            { text: 'Рейтинг', callback: () => console.log('Рейтинг') }
        ];

        this.buttonWidth = 140;
        this.buttonHeight = 35;
        this.buttonGap = 20;
        this.startX = 10; // отступ слева
    }

    // menu.js
    draw(ctx, canvas, player) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // === кнопки слева ===
        const leftMargin = 20;
        const topMargin = 20;
        const spacing = 20;

        this.buttons.forEach((b, i) => {
            b.x = leftMargin;
            b.y = topMargin + i * (b.h + spacing);

            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2 + 6);
        });

        // === ИГРОК СПРАВА ===
        if (!player || !player.skinCanvas) return;

        ctx.save();

        const px = canvas.width * 0.75;
        const py = canvas.height / 2;

        ctx.translate(px, py);
        ctx.drawImage(
            player.skinCanvas,
            -player.size / 2,
            -player.size / 2,
            player.size,
            player.size
        );

        ctx.restore();
    }

    handleClick(x, y) {
        for (const b of this.buttons) {
            if (x > b.x && x < b.x + this.buttonWidth && y > b.y && y < b.y + this.buttonHeight) {
                b.callback(); // вызываем коллбек кнопки
                return true;
            }
        }
        return false;
    }
}