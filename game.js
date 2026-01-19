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
// GLOBAL STATE
// =====================
let cameraY = 0;
let maxPlatformY = 0;
let inputX = 0;

// =====================
// PLAYER
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

    update() {
        this.x += inputX * 8;
        if (this.x < -this.size) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.size;

        this.lastY = this.y;
        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}

const player = new Player();

// =====================
// PLATFORM
// =====================
class Platform {
    constructor() { this.reset(); }

    reset() {
        this.x = 0;
        this.y = 0;
        this.prevY = 0;
        this.baseY = 0;
        this.type = 'normal';
        this.vx = 0;
        this.vy = 0;
        this.amplitude = 0;
        this.active = false;
        this.used = false; // для ломаемой
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
        if (type === 'broken') this.used = false;
    }

    update() {
        if (!this.active) return;

        this.prevY = this.y;

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
        if (this.y - cameraY > canvas.height) this.active = false;
    }

    draw() {
        if (!this.active) return;
        ctx.fillStyle =
            this.type === 'broken'   ? '#ff4444' :
            this.type === 'moving_vertical' ? '#8888ff' :
            this.type === 'moving_fast'     ? '#ff00ff' :
            this.type === 'moving_slow'     ? '#00ffff' :
            '#00ff88'; // normal

        ctx.fillRect(this.x, this.y - cameraY, CONFIG.PLATFORM_WIDTH, CONFIG.PLATFORM_HEIGHT);
    }

    checkCollision(player) {
        if (!this.active) return false;

        const prevBottom = player.lastY + player.size;
        const currBottom = player.y + player.size;

        if (
            player.vy > 0 &&
            prevBottom <= this.prevY + CONFIG.PLATFORM_HEIGHT &&
            currBottom >= this.prevY &&
            player.x + player.size > this.x &&
            player.x < this.x + CONFIG.PLATFORM_WIDTH
        ) {
            if (this.type === 'broken') {
                if (this.used) return false;
                this.used = true;
            }
            player.vy = -player.jumpForce;
            return true;
        }
        return false;
    }
}

// =====================
// PLATFORMS INIT
// =====================
const platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());

function spawnPlatform(p) {
    const gap = rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
    const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
    const y = maxPlatformY - gap;
    const type = pick(['normal', 'moving_slow', 'moving_fast', 'moving_vertical', 'broken']);
    p.spawn(x, y, type);
    maxPlatformY = y;
}

function initPlatforms() {
    maxPlatformY = canvas.height;
    platforms.forEach((p, i) => {
        if (i === 0) {
            const x = canvas.width / 2 - CONFIG.PLATFORM_WIDTH / 2;
            const y = canvas.height - 50;
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
canvas.addEventListener('touchstart', e => {
    inputX = e.touches[0].clientX < canvas.width / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchend', () => inputX = 0, { passive: false });

// =====================
// GAME LOOP
// =====================
function update() {
    // Игрок
    player.update();

    // ===== ПЛАВНАЯ КАМЕРА =====
    const screenAnchor = cameraY + canvas.height * 0.65;
    if (player.y < screenAnchor) {
        const targetCameraY = player.y - canvas.height * 0.65;
        cameraY += (targetCameraY - cameraY) * 0.15;
    }

    // Платформы
    platforms.forEach(p => {
        p.update();
        p.checkCollision(player);

        // Рецирклинг платформ
        if (!p.active) spawnPlatform(p);
    });

    // Game Over
    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        player.reset();
        initPlatforms();
        cameraY = 0;
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw());
    player.draw();
}

// =====================
// MAIN LOOP
// =====================
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();