// menu.js

export class Menu {
    constructor(onStartGame) {
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

        this.buttons = {
            play: { x: this.canvas.width/2 - 100, y: this.canvas.height/2 - 50, w: 200, h: 50, text: 'Играть' }
        };

        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.visible = false;
    }

    show() {
        this.visible = true;
        this.draw();
    }

    hide() {
        this.visible = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        if (!this.visible) return;
        const { ctx, canvas } = this;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Главное Меню', canvas.width/2, canvas.height/3);

        for (const key in this.buttons) {
            const b = this.buttons[key];
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.fillText(b.text, b.x + b.w/2, b.y + 32);
        }
    }

    handleClick(e) {
        if (!this.visible) return;
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
}