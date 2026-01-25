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

    draw(ctx, canvas) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';

        this.buttons.forEach((b, i) => {
            b.x = this.startX;
            b.y = 100 + i * (this.buttonHeight + this.buttonGap);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, this.buttonWidth, this.buttonHeight);
            ctx.fillText(b.text, b.x + this.buttonWidth / 2, b.y + this.buttonHeight / 2 + 10);
        });
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