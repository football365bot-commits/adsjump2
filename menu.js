// menu.js
export class Menu {
    constructor(onStartGame) {
        // создаём canvas для меню
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = 10; // поверх игрового canvas
        document.body.appendChild(this.canvas);

        this.onStartGame = onStartGame;

        // кнопка "Играть"
        this.buttons = {
            play: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 - 50,
                w: 200,
                h: 50,
                text: 'Играть'
            }
        };

        // обработчик клика по canvas
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.draw(); // сразу отрисовываем меню
    }

    draw() {
        const { ctx, canvas } = this;

        // фон
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // заголовок
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Главное Меню', canvas.width / 2, canvas.height / 3);

        // кнопка
        for (const key in this.buttons) {
            const b = this.buttons[key];
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.fillText(b.text, b.x + b.w / 2, b.y + 32);
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (const key in this.buttons) {
            const b = this.buttons[key];
            if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
                if (key === 'play') {
                    this.hide();
                    this.onStartGame();
                }
            }
        }
    }

    hide() {
        this.canvas.style.display = 'none';
    }

    show() {
        this.canvas.style.display = 'block';
        this.draw();
    }
}