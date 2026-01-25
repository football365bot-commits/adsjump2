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

    draw(ctx, canvas, player) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const leftMargin = 20;
        const topMargin = 20;
        const spacing = 20;

        const btnW = 200 * 0.7; 
        const btnH = 50 * 0.7;  

        this.buttons.forEach((b, i) => {
            b.x = leftMargin;
            b.y = topMargin + i * (btnH + spacing);
            b.w = btnW;
            b.h = btnH;

            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(b.text, b.x + b.w / 2, b.y + btnH / 2 + 7);
        });

        // === рисуем игрока справа ===
        if (player) {
            const savedX = player.x;
            const savedY = player.y;
            const savedCameraY = 0;

            // Размещаем игрока в правой половине
            player.x = canvas.width * 0.75;
            player.y = canvas.height / 2;

            player.draw(0); // передаем 0 вместо cameraY

            // Восстанавливаем исходные координаты игрока
            player.x = savedX;
            player.y = savedY;
        }
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