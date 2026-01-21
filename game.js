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
    FIRE_RATE: 150
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

        const dx = (target.x + CONFIG.ENEMY_SIZE/2) - (this.x + this.size/2);
        const dy = (target.y + CONFIG.ENEMY_SIZE/2) - (this.y + this.size/2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'player';
        bullet.x = this.x + this.size/2;
        bullet.y = this.y + this.size/2;
        bullet.vx = dx / dist * CONFIG.BULLET_SPEED;
        bullet.vy = dy / dist * CONFIG.BULLET_SPEED;
        bullet.damage = 10;
    }
}

// =====================
// PLATFORM
// =====================
class Platform {
    constructor() { this.reset(); }
    reset() {
        this.x = this.y = this.prevY = this.baseY = 0;
        this.movementType = 'static';
        this.isBroken = false;
        this.vx = this.vy = this.amplitude = 0;
        this.active = false;
        this.used = false;
    }
    spawn(x, y, movementType, isBroken) {
        this.reset();
        this.x = x;
        this.y = this.prevY = this.baseY = y;
        this.movementType = movementType;
        this.isBroken = isBroken;
        this.active = true;

        if (movementType === 'horizontal')
            this.vx = rand(1, 3) * (Math.random() < 0.5 ? -1 : 1);

        if (movementType === 'vertical') {
            this.vy = rand(1, 2);
            this.amplitude = rand(CONFIG.MIN_GAP * 0.5, CONFIG.MIN_GAP);
        }
    }
    update() {
        if (!this.active) return;
        this.prevY = this.y;
        if (this.movementType === 'horizontal') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.PLATFORM_WIDTH > canvas.width) this.vx *= -1;
        }
        if (this.movementType === 'vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude)
                this.vy *= -1;
        }
        if (this.y - cameraY > canvas.height) this.active = false;
    }
    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle =
            this.isBroken ? '#ff4444' :
            this.movementType === 'vertical' ? '#8888ff' :
            this.movementType === 'horizontal' ? '#00ffff' :
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
            if (this.isBroken) {
                if (this.used) return false;
                this.used = true;
                this.active = false;
            }
            player.vy = -player.jumpForce;
            return true;
        }
        return false;
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
        this.size = CONFIG.ENEMY_SIZE;
        this.lastShot = 0;
        this.damage = 10;
    }
    spawn(x, y, type) {
        this.reset();
        this.x = x;
        this.y = this.baseY = y;
        this.type = type;
        this.active = true;
        this.hp = 50;
        this.lastShot = performance.now();
    }
    update() {
        if (!this.active) return;

        if (this.type === 'horizontal') {
            this.x += this.vx;
            if (this.x < 0 || this.x + this.size > canvas.width) this.vx *= -1;
        }
        if (this.type === 'vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude)
                this.vy *= -1;
        }

        // авто-выстрел каждые 2 секунды
        if (performance.now() - this.lastShot > 2000) {
            enemyShoot(this);
            this.lastShot = performance.now();
        }

        if (this.y - cameraY > canvas.height || this.hp <= 0) this.active = false;
    }
    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}

// =====================
// GLOBAL STATE
// =====================
const player = new Player();
const platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
const enemies = Array.from({ length: CONFIG.MAX_ENEMIES }, () => new Enemy());
const bulletPool = Array.from({ length: CONFIG.BULLET_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 6,
    damage: 10,
    owner: null
}));

function getBullet() {
    return bulletPool.find(b => !b.active) || null;
}

let cameraY = 0;
let maxPlatformY = canvas.height;
let lastShotTime = 0;

// =====================
// BULLET LOGIC
// =====================
function enemyShoot(enemy) {
    const bullet = getBullet();
    if (!bullet) return;
    const dx = (player.x + player.size/2) - (enemy.x + enemy.size/2);
    const dy = (player.y + player.size/2) - (enemy.y + enemy.size/2);
    const dist = Math.hypot(dx, dy) || 1;

    bullet.active = true;
    bullet.owner = enemy;
    bullet.x = enemy.x + enemy.size/2;
    bullet.y = enemy.y + enemy.size/2;
    bullet.vx = dx / dist * 6;
    bullet.vy = dy / dist * 6;
    bullet.damage = enemy.damage;
}

function updateBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;

        b.x += b.vx;
        b.y += b.vy;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            b.active = false;
            continue;
        }

        if (b.owner === 'player') {
            for (const e of enemies) {
                if (!e.active) continue;
                if (b.x > e.x && b.x < e.x + e.size &&
                    b.y > e.y && b.y < e.y + e.size) {
                    e.hp -= b.damage;
                    b.active = false;
                    if (e.hp <= 0) e.active = false;
                    break;
                }
            }
        }

        if (b.owner instanceof Enemy) {
            if (b.x > player.x && b.x < player.x + player.size &&
                b.y > player.y && b.y < player.y + player.size) {
                player.hp -= b.damage;
                b.active = false;
            }
        }
    }
}

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    inputX = e.touches[0].clientX < canvas.width/2 ? -1 : 1;
}, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); inputX = 0; }, { passive: false });

// =====================
// SPAWN ENTITIES
function spawnEntities(isReset = false) {
    if (isReset) {
        maxPlatformY = canvas.height;
        platforms.forEach(p => p.reset());
        enemies.forEach(e => e.reset());

        const start = platforms[0];
        const x = canvas.width/2 - CONFIG.PLATFORM_WIDTH/2;
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
            p.spawn(x, y, pick(['static','horizontal','vertical']), Math.random()<0.1);
            maxPlatformY = y;
        }
    });

    enemies.forEach(e => {
        if (!e.active && Math.random() < CONFIG.ENEMY_BASE_CHANCE) {
            const x = rand(0, canvas.width - CONFIG.ENEMY_SIZE);
            const y = cameraY - CONFIG.ENEMY_SIZE;
            e.spawn(x, y, pick(['static','horizontal','vertical']));
        }
    });
}

// =====================
// CAMERA
// =====================
function updateCamera() {
    const minY = canvas.height*0.65;
    const target = Math.min(player.y - minY, cameraY);
    cameraY += (target - cameraY) * 0.18;
}

// =====================
// UPDATE
// =====================
function update() {
    player.update(inputX);
    platforms.forEach(p => { p.update(); p.checkCollision(player); });
    enemies.forEach(e => e.update());
    spawnEntities();
    updateCamera();

    // игрок стреляет по ближайшему врагу
    const target = enemies.find(e=>e.active);
    if (target && performance.now() - lastShotTime > CONFIG.FIRE_RATE) {
        player.shoot(target);
        lastShotTime = performance.now();
    }

    // обновление пуль
    updateBullets();

    if (player.y - cameraY > canvas.height || player.hp <=0) {
        alert('Game Over');
        player.reset();
        enemies.forEach(e=>e.reset());
        bulletPool.forEach(b=>b.active=false);
        cameraY=0;
        spawnEntities(true);
    }
}

// =====================
// DRAW
// =====================
function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    platforms.forEach(p=>p.draw(cameraY));
    enemies.forEach(e=>e.draw(cameraY));
    player.draw(cameraY);

    bulletPool.forEach(b=>{
        if(!b.active) return;
        ctx.fillStyle = b.owner==='player' ? '#ffff00' : '#ff8800';
        ctx.fillRect(b.x-3, b.y-cameraY-3, 6, 6);
    });
}

// =====================
// GAME LOOP
// =====================
spawnEntities(true);
function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();