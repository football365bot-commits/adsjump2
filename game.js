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

// =====================
// PLAYER
// =====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.size = CONFIG.PLAYER_SIZE;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
    }

    update(inputX) {
        this.x += inputX * 8;
        if (this.x < -this.size) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.size;

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
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.baseY = 0;
        this.type = 'normal';
        this.vx = 0;
        this.vy = 0;
        this.amplitude = 0;
        this.used = false;
    }

    spawn(x, y, type) {
        this.reset();
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.type = type;

        if (type === 'moving_slow') this.vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'moving_fast') this.vx = Math.random() < 0.5 ? 3 : -3;

        if (type === 'moving_vertical') {
            this.vy = 1;
            this.amplitude = rand(CONFIG.MIN_GAP * 0.5, CONFIG.MIN_GAP);
        }
    }

    update() {
        if (this.type === 'moving_slow' || this.type === 'moving_fast') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.PLATFORM_WIDTH > canvas.width) {
                this.vx *= -1;
            }
        }

        if (this.type === 'moving_vertical') {
            this.y += this.vy;
            if (
                this.y > this.baseY + this.amplitude ||
                this.y < this.baseY - this.amplitude
            ) {
                this.vy *= -1;
            }
        }
    }

    draw() {
        ctx.fillStyle =
            this.type === 'moving_vertical' ? '#8888ff' :
            this.type === 'moving_fast' ? '#ff00ff' :
            this.type === 'moving_slow' ? '#00ffff' :
            '#00ff88';

        ctx.fillRect(
            this.x,
            this.y - cameraY,
            CONFIG.PLATFORM_WIDTH,
            CONFIG.PLATFORM_HEIGHT
        );
    }

    checkCollision(player) {
        if (
            player.vy > 0 &&
            player.y + player.size <= this.y + 10 &&
            player.y + player.size >= this.y &&
            player.x + player.size > this.x &&
            player.x < this.x + CONFIG.PLATFORM_WIDTH
        ) {
            player.vy = -player.jumpForce;
        }
    }
}

// =====================
// GLOBAL STATE
// =====================
let player = new Player(canvas.width / 2, canvas.height / 2);
let platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
let cameraY = 0;
let maxPlatformY = player.y;

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

function initPlatforms() {
    maxPlatformY = player.y + 100;
    platforms.forEach(p => spawnPlatform(p));
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
// LOOP
// =====================
function update() {
    player.update(inputX);

    platforms.forEach(p => {
        p.update();
        p.checkCollision(player);

        if (p.y - cameraY > canvas.height) {
            spawnPlatform(p);
        }
    });

    const targetCam = player.y - canvas.height * 0.6;
    if (targetCam < cameraY) {
        cameraY += (targetCam - cameraY) * 0.15;
    }

    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        location.reload();
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