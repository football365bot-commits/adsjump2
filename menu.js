// menu.js
export class Menu {
    constructor() {
        // Создаём отдельный канвас для меню
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.buttons = [];
        this.active = true; // меню активно

        this.setupButtons();
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupButtons() {
        // Пример: кнопка Jump (начать игру)
        this.buttons.push({
            text: 'Jump',
            x: window.innerWidth / 2 - 75,
            y: window.innerHeight / 2 - 25,
            width: 150,
            height: 50,
            onClick: () => {
                this.hide();
                if (window.startGame) window.startGame(); // глобальная функция для запуска Game.js
            }
        });

        // Можно добавить больше кнопок, если нужно
    }

    hide() {
        this.active = false;
        this.canvas.style.display = 'none';
    }

    show() {
        this.active = true;
        this.canvas.style.display = 'block';
    }

    handleClick(x, y) {
        this.buttons.forEach(btn => {
            if (
                x >= btn.x && x <= btn.x + btn.width &&
                y >= btn.y && y <= btn.y + btn.height
            ) {
                btn.onClick();
            }
        });
    }

    loop() {
        if (!this.active) return;

        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем кнопки
        this.buttons.forEach(btn => {
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(btn.text, btn.x + btn.width/2, btn.y + btn.height/2);
        });

        requestAnimationFrame(() => this.loop());
    }
}

// Обработка клика мыши
document.addEventListener('click', e => {
    if (window.menuInstance && window.menuInstance.active) {
        window.menuInstance.handleClick(e.clientX, e.clientY);
    }
});

// Инициализация меню
window.menuInstance = new Menu();