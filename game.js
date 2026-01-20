// =====================
// CANVAS SETUP
// =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

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

// Универсальная функция для очистки объектов за экраном
function recycleIfOffScreen(obj) {
    if (!obj.active) return false;

    const top = cameraY;
    const bottom = cameraY + canvas.height;

    if (obj.y + (obj.height || CONFIG.PLATFORM_HEIGHT) < top ||
        obj.y > bottom ||
        obj.x + (obj.width || CONFIG.PLATFORM_WIDTH) < 0 ||
        obj.x > canvas.width) {

        obj.active = false;

        if ('prevY' in obj) obj.prevY = obj.y;
        if ('used' in obj) obj.used = false;

        return true;
    }
    return false;
}

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
        this.lastY = this.y;
    }

    update(inputX) {
        this.x += inputX * 12;
        if (this.x < -this.size) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.size;

        this.lastY = this.y;
        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;
    }

    draw(cameraY) {
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
        this.prevY = 0;
        this.baseY = 0;
        this.type = 'normal';
        this.vx = 0;
        this.vy = 0;
        this.amplitude = 0;
        this.active = false;
        this.used = false;
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

        if (this.type === 'moving_slow' || this.type === 'moving_fast') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.PLATFORM_WIDTH > canvas.width) this.vx *= -1;
        }

        if (this.type === 'moving_vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude) this.vy *= -1;
        }

        if (this.y - cameraY > canvas.height) this.active = false;
    }

    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle =
            this.type === 'broken' ? '#ff4444' :
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
// GLOBAL STATE
// =====================
const playerPool = [new Player()];
const player = playerPool[0];

let platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());

// Плавная камера
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

// =====================
// INIT PLATFORMS
// =====================
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
let inputX = 0;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    inputX = e.touches[0].clientX < canvas.width / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    inputX = 0;
}, { passive: false });

// =====================
// GAME LOOP
// =====================
let score = 0;
let lastPlayerY = player.y;
let startedJump = false;

function update() {
    player.update(inputX);

        // Платформы
        platforms.forEach(p => {
        // обновляем платформу
        p.update();

        // проверка коллизии только если платформа активна
        p.checkCollision(player);

        // если платформа ушла за экран вниз — сразу деактивируем и рециклим
        if (p.y - cameraY > canvas.height) {
            p.active = false;      // деактивируем
            spawnPlatform(p);      // создаём новую платформу сверху
        }
    });

    // Score
    if (!startedJump && player.vy < 0) {
        startedJump = true;
        lastPlayerY = player.y;
    }
    if (startedJump && player.y < lastPlayerY) {
        score += (lastPlayerY - player.y);
    }
    lastPlayerY = player.y;

    // ===== ПЛАВНАЯ КАМЕРА сверху =====
    // Плавная камера с разной скоростью вверх и вниз
function updateCamera() {
    const screenAnchor = cameraY + canvas.height * 0.65; // линия, выше которой камера начинает идти вверх

    if (player.y < screenAnchor) {
        // игрок поднимается — камера следует
        const targetCameraY = player.y - canvas.height * 0.65;
        cameraY += (targetCameraY - cameraY) * 0.18; // скорость подъёма
    } else if (player.y - cameraY > canvas.height * 0.75) {
        // игрок падает — камера почти не идёт вниз
        const targetCameraY = player.y - canvas.height * 0.75;
        cameraY += (targetCameraY - cameraY) * 0.03; // маленькая скорость вниз
    }
}

    // Game Over
    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        player.reset();
        initPlatforms();
        cameraY = canvas.height - 50; // стартуем от низа экрана
        startedJump = false;
        score = 0;
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw(cameraY));
    player.draw(cameraY);

    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();