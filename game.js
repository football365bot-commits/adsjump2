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
    BULLET_POOL_SIZE: 500
};

// =====================
// GLOBAL STATE
// =====================
let cameraY = 0;
let maxPlatformY = canvas.height;

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
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: 6,
    damage: 10,
    owner: null // 'player' или 'enemy'
}));

function getBullet() {
    return bulletPool.find(b => !b.active) || null;
}

function updateBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;

        b.x += b.vx;
        b.y += b.vy;

        // выход за экран
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            b.active = false;
            continue;
        }

        // попадания по врагам
        if (b.owner === 'player') {
            for (const e of enemies) {
                if (!e.active) continue;
                if (b.x > e.x && b.x < e.x + CONFIG.ENEMY_SIZE &&
                    b.y > e.y && b.y < e.y + CONFIG.ENEMY_SIZE) {
                    e.hp -= b.damage;
                    b.active = false;
                    if (e.hp <= 0) e.active = false;
                    break;
                }
            }
        }

        // попадания по игроку
        if (b.owner === 'enemy') {
            if (b.x > player.x && b.x < player.x + player.size &&
                b.y > player.y && b.y < player.y + player.size) {
                player.hp -= b.damage;
                b.active = false;
            }
        }
    }
}

// =====================
// PLAYER
// =====================
class Player {
    constructor() {
        this.size = CONFIG.PLAYER_SIZE;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.hp = 100;
        this.lastShot = 0;
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

    shoot(targetX, targetY) {
        const bullet = getBullet();
        if (!bullet) return;

        const dx = targetX - (this.x + this.size / 2);
        const dy = targetY - (this.y + this.size / 2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'player';
        bullet.x = this.x + this.size / 2;
        bullet.y = this.y + this.size / 2;
        bullet.vx = dx / dist * 12;
        bullet.vy = dy / dist * 12;
        bullet.damage = 10;
    }
}

// =====================
// ENEMY
// =====================
class Enemy {
    constructor() { this.reset(); }

    reset() {
        this.x = this.y = this.vx = this.vy = this.hp = 0;
        this.active = false;
        this.lastShot = 0;
    }

    spawn(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.vx = rand(-2, 2);
        this.vy = 0;
        this.hp = 50;
        this.lastShot = performance.now();
    }

    update() {
        if (!this.active) return;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x + CONFIG.ENEMY_SIZE > canvas.width) this.vx *= -1;
        if (this.y - cameraY > canvas.height || this.hp <= 0) this.active = false;

        // стрельба по игроку каждые 2 секунды
        if (performance.now() - this.lastShot > 2000) {
            this.shoot(player.x + player.size/2, player.y + player.size/2);
            this.lastShot = performance.now();
        }
    }

    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);
    }

    shoot(targetX, targetY) {
        const bullet = getBullet();
        if (!bullet) return;

        const dx = targetX - (this.x + CONFIG.ENEMY_SIZE/2);
        const dy = targetY - (this.y + CONFIG.ENEMY_SIZE/2);
        const dist = Math.hypot(dx, dy) || 1;

        bullet.active = true;
        bullet.owner = 'enemy';
        bullet.x = this.x + CONFIG.ENEMY_SIZE/2;
        bullet.y = this.y + CONFIG.ENEMY_SIZE/2;
        bullet.vx = dx / dist * 6; // скорость врага
        bullet.vy = dy / dist * 6;
        bullet.damage = 10;
        bullet.size = 6;
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
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude) this.vy *= -1;
        }
        if (this.y - cameraY > canvas.height) this.active = false;
    }

    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle = this.isBroken ? '#ff4444' : '#00ff88';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.PLATFORM_WIDTH, CONFIG.PLATFORM_HEIGHT);
    }

    checkCollision(player) {
        if (!this.active) return false;
        const prevBottom = player.lastY + player.size;
        const currBottom = player.y + player.size;
        if (player.vy > 0 &&
            prevBottom <= this.prevY + CONFIG.PLATFORM_HEIGHT &&
            currBottom >= this.prevY &&
            player.x + player.size > this.x &&
            player.x < this.x + CONFIG.PLATFORM_WIDTH) {
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
// GAME STATE
// =====================
const player = new Player();
const platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
const enemies = Array.from({ length: CONFIG.MAX_ENEMIES }, () => new Enemy());

// =====================
// SPAWN ENTITIES
function spawnEntities(isReset=false){
    if(isReset){
        maxPlatformY = canvas.height;
        platforms.forEach(p=>p.reset());
        enemies.forEach(e=>e.reset());

        const x = canvas.width/2 - CONFIG.PLATFORM_WIDTH/2;
        const y = canvas.height-50;
        platforms[0].spawn(x,y,'static',false);
        player.y = y - player.size;
        maxPlatformY = y;
    }

    platforms.forEach(p=>{
        if(!p.active){
            const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
            const y = maxPlatformY - rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
            p.spawn(x,y,'static',Math.random()<0.1);
            maxPlatformY = y;
        }
    });

    enemies.forEach(e=>{
        if(!e.active && Math.random()<CONFIG.ENEMY_BASE_CHANCE){
            const x = rand(0, canvas.width - CONFIG.ENEMY_SIZE);
            const y = cameraY - CONFIG.ENEMY_SIZE;
            e.spawn(x,y);
        }
    });
}

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('touchstart', e=>{
    e.preventDefault();
    inputX = e.touches[0].clientX < canvas.width/2 ? -1 : 1;
},{passive:false});
canvas.addEventListener('touchend', e=>{e.preventDefault(); inputX=0;},{passive:false});

// =====================
// GAME LOOP
// =====================
spawnEntities(true);

function update(){
    player.update(inputX);

    platforms.forEach(p=>{
        p.update();
        p.checkCollision(player);
    });

    enemies.forEach(e=>e.update());

    spawnEntities();

    updateBullets();

    if(player.y - cameraY > canvas.height || player.hp<=0){
        alert('Game Over');
        player.reset();
        player.hp=100;
        cameraY=0;
        spawnEntities(true);
    }
}

function draw(){
    ctx.fillStyle='#111';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    platforms.forEach(p=>p.draw(cameraY));
    enemies.forEach(e=>e.draw(cameraY));
    player.draw(cameraY);

    // draw bullets
    bulletPool.forEach(b=>{
        if(!b.active) return;
        ctx.fillStyle = b.owner==='player' ? '#ffff00' : '#ff00ff';
        ctx.fillRect(b.x-b.size/2, b.y-cameraY-b.size/2, b.size, b.size);
    });
}

function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();