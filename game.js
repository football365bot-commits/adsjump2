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
    CAMERA_SPEED: 1.25,
    BULLET_SPEED: 12,
    FIRE_RATE: 150,
    MAX_BULLETS: 500,
    MAX_ENEMIES: 5,
    MAX_PLATFORMS: 20
};

const ENEMY_STATS = {
    static: { speed: 0, damage: 1, hp: 5 },
    slow:   { speed: 3, damage: 2, hp: 7 },
    fast:   { speed: 6, damage: 4, hp: 10 }
};

const ITEM_TYPES = ['trampoline', 'drone', 'rocket', 'bomb', 'spikes', 'medkit', 'adrenaline'];

// =====================
// UTILS
// =====================
function getRandomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// =====================
// CLASSES
// =====================

// -------- PLAYER --------
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.hp = 100;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.size = CONFIG.PLAYER_SIZE;
        this.startedJump = false;
        this.lastY = y;
    }

    update(inputX) {
        this.x += inputX * 9;
        if (this.x < -this.size) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.size;

        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;

        // Score start tracking
        if (!this.startedJump && this.vy < 0) {
            this.startedJump = true;
            this.lastY = this.y;
        }
    }

    checkScore() {
        if (this.startedJump && this.y < this.lastY) {
            const diff = this.lastY - this.y;
            score += diff;
        }
        this.lastY = this.y;
    }

    draw(ctx, cameraY) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}

// -------- BULLET --------
class Bullet {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 4;
        this.damage = 0;
        this.owner = 'player';
    }

    spawn(x, y, vx, vy, damage, owner='player') {
        this.active = true;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.owner = owner;
    }

    update() {
        if (!this.active) return;
        this.x += this.vx;
        this.y += this.vy;

        // Off-screen
        if (this.x < 0 || this.x > canvas.width || this.y < cameraY || this.y > cameraY + canvas.height) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = this.owner === 'player' ? '#ffff00' : '#ff00ff';
        ctx.fillRect(this.x - this.size/2, this.y - cameraY - this.size/2, this.size, this.size);
    }
}

// -------- PLATFORM --------
class Platform {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.type = 'normal'; // normal, broken, moving_slow, moving_fast
        this.vx = 0;
        this.used = false;
        this.item = null;
        this.width = CONFIG.PLATFORM_WIDTH;
        this.height = CONFIG.PLATFORM_HEIGHT;
    }

    spawn(x, y, type, vx=0, item=null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = vx;
        this.used = false;
        this.item = item;
    }

    update() {
        // Movement
        if (this.type === 'moving_slow' || this.type === 'moving_fast') {
            this.x += this.vx;
            if (this.x < 0) this.vx = Math.abs(this.vx);
            if (this.x + this.width > canvas.width) this.vx = -Math.abs(this.vx);
        }
    }

    draw(ctx) {
        if (this.type === 'broken' && this.used) return;
        switch(this.type){
            case 'normal': ctx.fillStyle = '#00ff88'; break;
            case 'broken': ctx.fillStyle = '#ff4444'; break;
            case 'moving_slow': ctx.fillStyle = '#00ffff'; break;
            case 'moving_fast': ctx.fillStyle = '#ff00ff'; break;
        }
        ctx.fillRect(this.x, this.y - cameraY, this.width, this.height);

        // Item
        if (this.item) {
            const itemX = this.x + this.width/2 - 10;
            const itemY = this.y - cameraY - 20;
            switch(this.item){
                case 'trampoline': ctx.fillStyle='#ffff00'; break;
                case 'drone': ctx.fillStyle='#ff8800'; break;
                case 'rocket': ctx.fillStyle='#ff0000'; break;
                case 'spikes': ctx.fillStyle='#888888'; break;
                case 'bomb': ctx.fillStyle='#000000'; break;
                case 'medkit': ctx.fillStyle='#00ff00'; break;
                case 'adrenaline': ctx.fillStyle='#ff00ff'; break;
            }
            ctx.fillRect(itemX, itemY, 20, 20);
        }
    }

    checkCollision(player) {
        if (player.vy > 0 &&
            player.y <= this.y + this.height &&
            player.y >= this.y &&
            player.x + player.size > this.x &&
            player.x < this.x + this.width
        ) {
            if (!(this.type === 'broken' && this.used)) {
                player.vy = -player.jumpForce;
                if (this.type === 'broken') this.used = true;
                return true;
            }
        }
        return false;
    }
}

// -------- ENEMY --------
class Enemy {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 30;
        this.type = 'static';
        this.hp = 0;
        this.maxHp = 0;
        this.damage = 0;
        this.lastShot = 0;
    }

    spawn(x, y, type, difficulty=1) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = (type==='slow'?ENEMY_STATS.slow.speed:(type==='fast'?ENEMY_STATS.fast.speed:0)) * (Math.random()<0.5?-1:1) * difficulty;
        this.vy = 0;
        this.hp = ENEMY_STATS[type].hp * difficulty;
        this.maxHp = this.hp;
        this.damage = ENEMY_STATS[type].damage * difficulty;
        this.lastShot = performance.now();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.vx = Math.abs(this.vx);
        if (this.x + this.size > canvas.width) this.vx = -Math.abs(this.vx);
    }

    draw(ctx) {
        switch(this.type){
            case 'static': ctx.fillStyle='#ff0000'; break;
            case 'slow': ctx.fillStyle='#ff8800'; break;
            case 'fast': ctx.fillStyle='#ffff00'; break;
        }
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
        // HP bar
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x, this.y - cameraY - 6, this.size, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY - 6, this.size * hpPercent, 4);
    }
}

// =====================
// GLOBAL STATE
// =====================
let player = new Player(canvas.width/2, canvas.height/3);
let platforms = Array.from({length: CONFIG.MAX_PLATFORMS}, () => new Platform());
let bullets = Array.from({length: CONFIG.MAX_BULLETS}, () => new Bullet());
let activeEnemies = [];
let inactiveEnemies = Array.from({length: CONFIG.MAX_ENEMIES}, () => new Enemy());
let cameraY = player.y - canvas.height / 2;
let score = 0;

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const x = e.touches[0].clientX;
    inputX = x < canvas.width/2 ? -1 : 1;
});
canvas.addEventListener('touchend', e => { e.preventDefault(); inputX = 0; });

// =====================
// GAME LOOP
// =====================
function update(dt) {
    player.update(inputX);
    player.checkScore();

    // Update platforms
    for (const p of platforms) {
        p.update();
        if (p.checkCollision(player) && p.item) {
            // TODO: apply item effects
            p.item = null;
        }
    }

    // Update bullets
    for (const b of bullets) b.update();

    // Update enemies
    for (const e of activeEnemies) e.update();

    // Camera follows player
    const screenAnchor = cameraY + canvas.height*0.65;
    if (player.y < screenAnchor) {
        const targetCameraY = player.y - canvas.height*0.65;
        cameraY += (targetCameraY - cameraY) * 0.15;
    }

    // Game Over
    if (player.hp <= 0 || player.y - cameraY > canvas.height) {
        alert('Game Over');
        location.reload();
    }
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#111';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Platforms
    for (const p of platforms) p.draw(ctx);

    // Player
    player.draw(ctx, cameraY);

    // Enemies
    for (const e of activeEnemies) e.draw(ctx);

    // Bullets
    for (const b of bullets) b.draw(ctx);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font='20px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20,30);
    ctx.fillText(`HP: ${player.hp}`, canvas.width-100,30);
}

let lastTime = 0;
function gameLoop(t) {
    const dt = t - lastTime;
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);