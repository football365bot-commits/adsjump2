// menu.js
import { startGame } from './game.js'; // функция, которая запускает твой Game.js

class Menu {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = 10;
        document.body.appendChild(this.canvas);

        this.buttons = {
            play: {
                x: this.canvas.width / 2 - 100,
                y: this.canvas.height / 2 - 50,
                w: 200,
                h: 50,
                text: 'Играть'
            }
        };

        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        this.draw();
    }

    draw() {
        const { ctx, canvas } = this;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Главное Меню', canvas.width / 2, canvas.height / 3);

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

        const b = this.buttons.play;
        if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
            this.hide();
            startGame(); // запускаем Game.js
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

// создаём меню при загрузке
new Menu();