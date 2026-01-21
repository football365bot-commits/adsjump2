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
    GRAVITY: 0.8,
    BASE_JUMP_FORCE: 13.5,
    PLAYER_SIZE: 40,
    PLATFORM_WIDTH: 50,
    PLATFORM_HEIGHT: 12,
    MIN_GAP: 85,
    MAX_GAP: 105,
    MAX_PLATFORMS: 18,
    ENEMY_SIZE: 30,
    MAX_ENEMIES: 10,
    ENEMY_BASE_CHANCE: 0.002,
    BULLET_POOL_SIZE: 500,
    BULLET_SPEED: 12,
    BULLET_DAMAGE: 10
};

// =====================
// UTILS
// =====================
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// =====================
// BULLET POOL
// =====================
const bulletPool = Array.from({ length: CONFIG.BULLET_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    owner: null,
    damage: CONFIG.BULLET_DAMAGE
}));

function getBullet() {
    return bulletPool.find(b => !b.active) || null;
}

function updateBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;

        // движение
        b.x += b.vx;
        b.y += b.vy;

        // сразу возвращаем пулю в пул, если вышла за экран
        if (b.x < 0 || b.x > canvas.width || b.y - cameraY < 0 || b.y - cameraY > canvas.height) {
            b.active = false;
            continue;
        }

        // попадание игрока по врагам
        if (b.owner === 'player') {
            for (const e of enemies) {
                if (!e.active) continue;
                if (b.x > e.x && b.x < e.x + CONFIG.ENEMY_SIZE &&
                    b.y > e.y && b.y < e.y + CONFIG.ENEMY_SIZE) {
                    e.hp -= b.damage;
                    b.active = false; // сразу в пул
                    break;
                }
            }
        }

        // попадание врага по игроку
        if (b.owner === 'enemy') {
            if (b.x > player.x && b.x < player.x + player.size &&
                b.y > player.y && b.y < player.y + player.size) {
                player.hp -= b.damage;
                b.active = false; // сразу в пул
            }
        }
    }
}

function drawBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;
        ctx.fillStyle = b.owner === 'player' ? '#ffff00' : '#ff8800';
        ctx.fillRect(b.x - 4, b.y - cameraY - 4, 8, 8);
    }
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
        this.hp = 100;
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

    shoot(target) {
        const bullet = getBullet();
        if (!bullet) return;

        const dx = (target.x + CONFIG.ENEMY_SIZE / 2) - (this.x + this.size / 2);
        const dy = (target.y + CONFIG.ENEMY_SIZE / 2) - (this.y + this.size / 2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'player';
        bullet.x = this.x + this.size / 2;
        bullet.y = this.y + this.size / 2;
        bullet.vx = dx / dist * CONFIG.BULLET_SPEED;
        bullet.vy = dy / dist * CONFIG.BULLET_SPEED;
    }
}

// =====================
// ENEMY
// =====================
class Enemy {
    constructor() { this.reset(); }

    reset() {
        this.x = this.y = this.vx = this.vy = this.amplitude = this.baseY = 0;
        this.type = 'static';
        this.active = false;
        this.hp = 50;
    }

    spawn(x, y, type) {
        this.reset();
        this.x = x;
        this.y = this.baseY = y;
        this.type = type;
        this.active = true;

        const f = ScoreManager.difficultyFactor();
        if (type === 'horizontal') this.vx = (rand(1, 2) + 2 * f) * (Math.random() < 0.5 ? -1 : 1);
        if (type === 'vertical') {
            this.vy = rand(1, 2) + 2 * f;
            this.amplitude = rand(50, 120);
        }
    }

    update() {
        if (!this.active) return;

        if (this.type === 'horizontal') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.ENEMY_SIZE > canvas.width) this.vx *= -1;
        }

        if (this.type === 'vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude)
                this.vy *= -1;
        }

        // стрельба по игроку
        if (this.active && Math.random() < 0.02) { // пример: 2% шанс на кадр
            this.shoot(player);
        }

        if (this.y - cameraY > canvas.height || this.hp <= 0) this.active = false;
    }

    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);
    }

    shoot(target) {
        const bullet = getBullet();
        if (!bullet) return;

        const dx = (target.x + target.size / 2) - (this.x + CONFIG.ENEMY_SIZE / 2);
        const dy = (target.y + target.size / 2) - (this.y + CONFIG.ENEMY_SIZE / 2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'enemy';
        bullet.x = this.x + CONFIG.ENEMY_SIZE / 2;
        bullet.y = this.y + CONFIG.ENEMY_SIZE / 2;
        bullet.vx = dx / dist * CONFIG.BULLET_SPEED;
        bullet.vy = dy / dist * CONFIG.BULLET_SPEED;
        bullet.damage = 10;
    }
}

// =====================
// GLOBAL STATE
// =====================
const player = new Player();
const platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
const enemies = Array.from({ length: CONFIG.MAX_ENEMIES }, () => new Enemy());
let cameraY = 0;
let maxPlatformY = canvas.height;

// =====================
// SCORE
// =====================
const ScoreManager = {
    value: 0,
    maxY: null,
    update(p) {
        if (this.maxY === null || p.y < this.maxY) {
            if (this.maxY !== null) this.value += this.maxY - p.y;
            this.maxY = p.y;
        }
    },
    reset() {
        this.value = 0;
        this.maxY = null;
    },
    difficultyFactor() {
        return Math.min(this.value / 500, 1);
    }
};

// =====================
// SPAWN / RESET
// =====================
function spawnEntities(isReset = false) {
    const factor = ScoreManager.difficultyFactor();

    if (isReset) {
        maxPlatformY = canvas.height;
        platforms.forEach(p => p.reset());
        enemies.forEach(e => e.reset());

        const start = platforms[0];
        const x = canvas.width / 2 - CONFIG.PLATFORM_WIDTH / 2;
        const y = canvas.height - 50;
        start.spawn(x, y, 'static', false);
        player.y = y - player.size;
        maxPlatformY = y;
    }

    platforms.forEach(p => {
        if (!p.active) {
            const gap = rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
            const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
            const y = maxPlatformY - gap;

            const types = ['static'];
            if (Math.random() < 0.3 + 0.7 * factor) types.push('horizontal');
            if (Math.random() < 0.2 * factor) types.push('vertical');

            p.spawn(x, y, pick(types), Math.random() < 0.1);
            maxPlatformY = y;
        }
    });

    enemies.forEach(e => {
        if (!e.active && Math.random() < CONFIG.ENEMY_BASE_CHANCE + 0.003 * factor) {
            const x = rand(0, canvas.width - CONFIG.ENEMY_SIZE);
            const y = cameraY - CONFIG.ENEMY_SIZE;
            e.spawn(x, y, pick(['static', 'horizontal', 'vertical']));
        }
    });
}

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
// CAMERA
// =====================
function updateCamera() {
    const minY = canvas.height * 0.65;
    const target = Math.min(player.y - minY, cameraY);
    cameraY += (target - cameraY) * 0.18;
}

// =====================
// GAME LOOP
// =====================
spawnEntities(true);

function update() {
    player.update(inputX);

    platforms.forEach(p => {
        p.update();
        p.checkCollision(player);
    });

    enemies.forEach(e => e.update());
    spawnEntities();

    // авто-выстрел игрока по первому активному врагу
    const target = enemies.find(e => e.active);
    if (target) player.shoot(target);

    updateBullets();
    ScoreManager.update(player);
    updateCamera();

    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        player.reset();
        ScoreManager.reset();
        cameraY = 0;
        bulletPool.forEach(b => b.active = false); // обнулить пул
        spawnEntities(true);
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw(cameraY));
    enemies.forEach(e => e.draw(cameraY));
    player.draw(cameraY);
    drawBullets();

    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${Math.floor(ScoreManager.value)}`, 20, 30);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();