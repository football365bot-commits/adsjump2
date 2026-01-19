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

        if (!this.startedJump && this.vy < 0) {
            this.startedJump = true;
            this.lastY = this.y;
        }
    }

    checkScore() {
        if (this.startedJump && this.y < this.lastY) {
            score += this.lastY - this.y;
        }
        this.lastY = this.y;
    }

    draw(ctx, cameraY) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}

// -------- PLATFORM --------
class Platform {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.type = 'normal'; // normal, broken, moving_slow, moving_fast, moving_vertical
        this.vx = 0;
        this.vy = 0;
        this.amplitude = 0; // для вертикальной платформы
        this.baseY = 0;
        this.used = false;
        this.item = null;
        this.width = CONFIG.PLATFORM_WIDTH;
        this.height = CONFIG.PLATFORM_HEIGHT;
    }

    spawn(x, y, type, vx=0, amplitude=0, item=null) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.type = type;
        this.vx = vx;
        this.amplitude = amplitude;
        this.vy = type === 'moving_vertical' ? 1 : 0; // вверх/вниз
        this.used = false;
        this.item = item;
    }

    update() {
        // Горизонтальная платформа
        if (this.type === 'moving_slow' || this.type === 'moving_fast') {
            this.x += this.vx;
            if (this.x < 0) this.vx = Math.abs(this.vx);
            if (this.x + this.width > canvas.width) this.vx = -Math.abs(this.vx);
        }

        // Вертикальная платформа
        if (this.type === 'moving_vertical') {
            this.y += this.vy;
            if (this.y < this.baseY - this.amplitude || this.y > this.baseY + this.amplitude) {
                this.vy *= -1; // меняем направление
            }
        }
    }

    draw(ctx) {
        if (this.type === 'broken' && this.used) return;
        switch(this.type){
            case 'normal': ctx.fillStyle = '#00ff88'; break;
            case 'broken': ctx.fillStyle = '#ff4444'; break;
            case 'moving_slow': ctx.fillStyle = '#00ffff'; break;
            case 'moving_fast': ctx.fillStyle = '#ff00ff'; break;
            case 'moving_vertical': ctx.fillStyle = '#8888ff'; break;
        }
        ctx.fillRect(this.x, this.y - cameraY, this.width, this.height);

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

// =====================
// GLOBAL STATE
// =====================
let player = new Player(canvas.width/2, canvas.height/3);
let platforms = Array.from({length: CONFIG.MAX_PLATFORMS}, () => new Platform());
let maxPlatformY = canvas.height;
let cameraY = player.y - canvas.height/2;
let score = 0;

// =====================
// PLATFORM SPAWN/RECYCLE
// =====================
function spawnPlatform() {
    const p = platforms.find(pl => pl.y - cameraY > canvas.height); // берем платформу, которая ушла вниз
    if (!p) return;

    // тип платформы
    const types = ['normal','broken','moving_slow','moving_fast','moving_vertical'];
    const type = pickRandom(types);

    // горизонтальная скорость
    let vx = 0;
    if (type === 'moving_slow') vx = Math.random()<0.5 ? 1 : -1;
    if (type === 'moving_fast') vx = Math.random()<0.5 ? 3 : -3;

    // вертикальная амплитуда
    let amplitude = 0;
    if (type === 'moving_vertical') amplitude = getRandomBetween(CONFIG.MIN_GAP, CONFIG.MAX_GAP);

    const gap = getRandomBetween(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
    const x = Math.random() * (canvas.width - CONFIG.PLATFORM_WIDTH);
    const y = maxPlatformY - gap;

    p.spawn(x, y, type, vx, amplitude, pickRandom(ITEM_TYPES));

    maxPlatformY = y; // обновляем верхнюю платформу
}

// Изначальный спавн
for (let i = 0; i < platforms.length; i++) spawnPlatform();

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

    for (const p of platforms) {
        p.update();
        p.checkCollision(player);
        if (p.y - cameraY > canvas.height) spawnPlatform(); // рециркуляция
    }

    // камера
    const screenAnchor = cameraY + canvas.height*0.65;
    if (player.y < screenAnchor) {
        const targetCameraY = player.y - canvas.height*0.65;
        cameraY += (targetCameraY - cameraY) * 0.15;
    }

    if (player.hp <=0 || player.y - cameraY > canvas.height) {
        alert('Game Over');
        location.reload();
    }
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#111';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for (const p of platforms) p.draw(ctx);
    player.draw(ctx, cameraY);

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