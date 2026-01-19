// =====================
// CANVAS SETUP
// =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Отключаем стандартные действия браузера на canvas
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });
canvas.addEventListener('wheel', e => e.preventDefault(), { passive: false });

// Сенсорное управление остаётся
canvas.addEventListener('touchstart', e => {
    inputX = e.touches[0].clientX < canvas.width / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchend', e => {
    inputX = 0;
}, { passive: false });

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// =====================
// CONFIG
// =====================
const CONFIG = {
    GRAVITY: 0.6,
    BASE_JUMP_FORCE: 15,
    PLAYER_SIZE: 40,
    PLATFORM_WIDTH: 65,
    PLATFORM_HEIGHT: 15,
    MIN_GAP: 120,
    MAX_GAP: 160,
    MAX_PLATFORMS: 20
};

// =====================
// UTILS
// =====================
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// =====================
// PLAYER (с пулом)
// =====================
class Player {
    constructor() {
        this.size = CONFIG.PLAYER_SIZE;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.reset();
    }

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.vy = 0;
        this.lastY = this.y; // для коллизии
    }

    update(inputX) {
        this.x += inputX * 8;
        if (this.x < -this.size) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.size;

        this.lastY = this.y; // запоминаем прошлую позицию
        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}

// =====================
// PLATFORM
// =====================
class Platform {
    constructor() { this.reset(); }

    reset() {
        this.x = 0;
        this.y = 0;
        this.prevY = 0; // прошлое положение для коллизии
        this.baseY = 0;
        this.type = 'normal';
        this.vx = 0;
        this.vy = 0;
        this.amplitude = 0;
        this.active = false;
    }

    spawn(x, y, type) {
        this.reset();
        this.x = x;
        this.y = y;
        this.prevY = y;
        this.baseY = y;
        this.type = type;
        this.active = true;

        if (type === 'moving_slow') this.vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'moving_fast') this.vx = Math.random() < 0.5 ? 3 : -3;
        if (type === 'moving_vertical') {
            this.vy = 1;
            this.amplitude = rand(CONFIG.MIN_GAP * 0.5, CONFIG.MIN_GAP);
        }
    }

    update() {
        if (!this.active) return;

        this.prevY = this.y; // сохраняем прошлое положение для коллизии

        // Горизонтальное движение
        if (this.type === 'moving_slow' || this.type === 'moving_fast') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.PLATFORM_WIDTH > canvas.width) this.vx *= -1;
        }

        // Вертикальное движение
        if (this.type === 'moving_vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude) {
                this.vy *= -1;
            }
        }

        // Если платформа ушла за экран вниз → деактивируем
        if (this.y - cameraY > canvas.height) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;
        ctx.fillStyle =
            this.type === 'moving_vertical' ? '#8888ff' :
            this.type === 'moving_fast' ? '#ff00ff' :
            this.type === 'moving_slow' ? '#00ffff' :
            '#00ff88';

        ctx.fillRect(this.x, this.y - cameraY, CONFIG.PLATFORM_WIDTH, CONFIG.PLATFORM_HEIGHT);
    }

    checkCollision(player) {
        if (!this.active) return false;

        const prevBottom = player.lastY + player.size;
        const currBottom = player.y + player.size;

        // стандартная проверка коллизии с учетом прошлого кадра
        if (
            player.vy > 0 &&
            prevBottom <= this.prevY + CONFIG.PLATFORM_HEIGHT &&
            currBottom >= this.prevY &&
            player.x + player.size > this.x &&
            player.x < this.x + CONFIG.PLATFORM_WIDTH
        ) {
            player.vy = -player.jumpForce;
            return true;
        }
        return false;
    }
}

// =====================
// GLOBAL STATE
// =====================
const playerPool = [new Player()];
const player = playerPool[0];

let platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
let cameraY = 0;
let maxPlatformY = canvas.height;

// =====================
// PLATFORM SPAWN
// =====================
function spawnPlatform(p) {
    const gap = rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
    const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
    const y = maxPlatformY - gap;
    const type = pick(['normal', 'moving_slow', 'moving_fast', 'moving_vertical']);

    p.spawn(x, y, type);
    maxPlatformY = y;
}

// Инициализация платформ и первой платформы под игрока
function initPlatforms() {
    maxPlatformY = canvas.height;

    platforms.forEach((p, i) => {
        if (i === 0) {
            // Первая платформа под игрока — статичная
            const x = canvas.width / 2 - CONFIG.PLATFORM_WIDTH / 2;
            const y = canvas.height - 50; // чуть выше нижней границы
            p.spawn(x, y, 'normal');
            player.y = p.y - player.size;
            maxPlatformY = y;
        } else {
            spawnPlatform(p);
        }
    });
}
initPlatforms();

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('touchstart', e => {
    inputX = e.touches[0].clientX < canvas.width / 2 ? -1 : 1;
});
canvas.addEventListener('touchend', () => inputX = 0);

// =====================
// GAME LOOP
// =====================
function update() {
    player.update(inputX);

    platforms.forEach(p => {
        p.update();
        p.checkCollision(player);

        if (!p.active) spawnPlatform(p);
    });

    const targetCam = player.y - canvas.height * 0.6;
    if (targetCam < cameraY) cameraY += (targetCam - cameraY) * 0.15;

    // Game Over
    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        player.reset();     // сброс игрока
        initPlatforms();    // перезапуск платформ
        cameraY = 0;
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw());
    player.draw();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();