export class Menu {
    constructor(onStartGame) {
        this.onStartGame = onStartGame;

        // создаём состояния прямо здесь
        this.states = {
            Inventory: { name: 'Инвентарь' },
            Shop: { name: 'Магазин' },
            Achievements: { name: 'Достижения' },
            Settings: { name: 'Настройки' },
            Leaderboard: { name: 'Рейтинг' }
        };

        // текущее активное состояние меню (может быть null)
        this.activeState = null;

        // кнопки с коллбеками на состояния
        this.buttons = [
            { text: 'Jump', callback: this.onStartGame },
            { text: 'Инвентарь', callback: () => this.activateState('Inventory') },
            { text: 'Магазин', callback: () => this.activateState('Shop') },
            { text: 'Достижения', callback: () => this.activateState('Achievements') },
            { text: 'Настройки', callback: () => this.activateState('Settings') },
            { text: 'Рейтинг', callback: () => this.activateState('Leaderboard') }
        ];

        this.buttonWidth = 120;
        this.buttonHeight = 50;
        this.buttonGap = 25;
        this.startX = 10;
        this.startY = null;
    }

    // функция для активации состояния
    activateState(stateKey) {
        // переключаем состояние на выбранное
        this.activeState = this.states[stateKey];
        console.log('Активировано состояние:', this.activeState.name);
    }

    draw(ctx, canvas, player) {
        // фон
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const totalHeight = this.buttons.length * this.buttonHeight + (this.buttons.length - 1) * this.buttonGap;
        this.startY = (canvas.height / 2) - (totalHeight / 2);

        // рисуем кнопки
        this.buttons.forEach((b, i) => {
            b.x = this.startX;
            b.y = this.startY + i * (this.buttonHeight + this.buttonGap);
            b.w = this.buttonWidth;
            b.h = this.buttonHeight;

            const isActive = this.activeState && this.activeState.name === b.text;

            ctx.strokeStyle = isActive ? '#00ff00' : '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = isActive ? '#00ff00' : '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2);
        });

        // игрок справа
        if (player && player.menuSkinCanvas) {
            const px = canvas.width * 0.625;
            const py = canvas.height / 2;
            const menuSize = player.menuSkinCanvas.width;

            ctx.save();
            ctx.translate(px, py);
            ctx.drawImage(player.menuSkinCanvas, -menuSize/2, -menuSize/2, menuSize, menuSize);
            ctx.restore();
        }

        // рисуем контент текущего состояния (пока заглушка)
        if (this.activeState) {
            ctx.fillStyle = '#222';
            ctx.fillRect(canvas.width / 3, canvas.height / 4, canvas.width / 2, canvas.height / 2);

            ctx.fillStyle = '#fff';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.activeState.name, canvas.width / 2, canvas.height / 2);
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