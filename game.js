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
    speed: CONFIG.BULLET_SPEED,
    damage: CONFIG.BULLET_DAMAGE
}));

function getBullet() {
    for (let b of bulletPool) if (!b.active) return b;
    return null;
}

function updateBullets() {
    for (let b of bulletPool) {
        if (!b.active) continue;

        b.x += b.vx;
        b.y += b.vy;

        // Пуля ушла за экран → возвращаем в пул
        if (b.x < 0 || b.x > canvas.width || b.y - cameraY < 0 || b.y - cameraY > canvas.height) {
            b.active = false;
            continue;
        }

        // Столкновение игрок → враг
        if (b.owner === 'player') {
            for (let e of enemies) {
                if (!e.active) continue;
                if (b.x > e.x && b.x < e.x + CONFIG.ENEMY_SIZE &&
                    b.y > e.y && b.y < e.y + CONFIG.ENEMY_SIZE) {
                    e.hp -= b.damage;
                    b.active = false;
                    break;
                }
            }
        }

        // Столкновение враг → игрок
        if (b.owner === 'enemy') {
            if (player.x < b.x && b.x < player.x + CONFIG.PLAYER_SIZE &&
                player.y < b.y && b.y < player.y + CONFIG.PLAYER_SIZE) {
                // Моментальный “урон” — можно расширить
                b.active = false;
                // Можно добавить жизнь игрока
            }
        }
    }
}

function drawBullets() {
    for (let b of bulletPool) {
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
    }

    shoot(targetX, targetY) {
        const bullet = getBullet();
        if (!bullet) return;
        const dx = targetX - (this.x + this.size/2);
        const dy = targetY - (this.y + this.size/2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'player';
        bullet.x = this.x + this.size/2;
        bullet.y = this.y + this.size/2;
        bullet.vx = dx / dist * bullet.speed;
        bullet.vy = dy / dist * bullet.speed;
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
    }

    shoot(playerX, playerY) {
        const bullet = getBullet();
        if (!bullet) return;
        const dx = playerX - (this.x + CONFIG.ENEMY_SIZE/2);
        const dy = playerY - (this.y + CONFIG.ENEMY_SIZE/2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'enemy';
        bullet.x = this.x + CONFIG.ENEMY_SIZE/2;
        bullet.y = this.y + CONFIG.ENEMY_SIZE/2;
        bullet.vx = dx / dist * bullet.speed;
        bullet.vy = dy / dist * bullet.speed;
    }

    update() {
        if (!this.active) return;
        // Можно добавить движение, если нужно
        if (this.hp <= 0) this.active = false;

        // Простейшая логика: стреляем в игрока, если активны
        this.shoot(player.x + CONFIG.PLAYER_SIZE/2, player.y + CONFIG.PLAYER_SIZE/2);
    }

    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);
    }
}

// =====================
// GLOBAL STATE
// =====================
const player = new Player();
const platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => ({})); // заглушка
const enemies = Array.from({ length: CONFIG.MAX_ENEMIES }, () => new Enemy());

let cameraY = 0;

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    inputX = e.touches[0].clientX < canvas.width/2 ? -1 : 1;
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
function update() {
    player.update(inputX);
    enemies.forEach(e => e.update());
    updateBullets();
    updateCamera();
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    player.draw(cameraY);
    enemies.forEach(e => e.draw(cameraY));
    drawBullets();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();

// =====================
// PLAYER AUTOMATIC SHOOT EXAMPLE
// =====================
// Стрельба игрока в первый активный враг
setInterval(() => {
    const target = enemies.find(e => e.active);
    if (target) player.shoot(target.x + CONFIG.ENEMY_SIZE/2, target.y + CONFIG.ENEMY_SIZE/2);
}, 300);