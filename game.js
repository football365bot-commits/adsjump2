// =====================
// GAME.JS (ВСЁ В ОДНОМ)
// =====================

// ==== CANVAS SETUP ====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ==== GAME STATE ====
const GameState = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover'
};
let gameState = GameState.PLAYING;

// ==== CONFIG ====
const CONFIG = {
    GRAVITY: 0.8,
    PLAYER_SIZE: 40,
    BASE_JUMP_FORCE: 13,
    PLATFORM_WIDTH: 50,
    PLATFORM_HEIGHT: 12,
    MIN_GAP: 85,
    MAX_GAP: 100,
    MAX_PLATFORMS: 18,
    MAX_ENEMIES: 5,
    MAX_ITEMS: 7,
    BULLET_SPEED: 13,
    PLAYER_BULLET_DAMAGE: 1,
    ENEMY_HP: 10,
};

// ==== UTILS ====
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function isOnScreen(obj) {
    return obj.y - cameraY + (obj.size || CONFIG.PLAYER_SIZE) > 0 &&
           obj.y - cameraY < canvas.height;
}

// ==== GLOBAL STATE ====
let cameraY = 0;
let inputX = 0;
let coins = 0;

// =====================
// PLAYER
// =====================
class Player {
    constructor() {
        this.size = CONFIG.PLAYER_SIZE;
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.vy = 0;
        this.hp = 100;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.hasNFT = false; // поднял NFT Box?
    }

    update(inputX) {
        this.x += inputX * 10;
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

const player = new Player();

// =====================
// PLATFORMS
// =====================
class Platform {
    constructor() { this.reset(); }
    reset() { this.active = false; this.x = 0; this.y = 0; }
    spawn(x, y) { this.x = x; this.y = y; this.active = true; }
    draw() {
        if (!this.active) return;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.PLATFORM_WIDTH, CONFIG.PLATFORM_HEIGHT);
    }
    checkCollision(player) {
        if (!this.active) return false;
        if (player.vy > 0 &&
            player.y + player.size >= this.y &&
            player.y + player.size <= this.y + CONFIG.PLATFORM_HEIGHT &&
            player.x + player.size > this.x &&
            player.x < this.x + CONFIG.PLATFORM_WIDTH) {
            player.vy = -player.jumpForce;
            return true;
        }
        return false;
    }
}
const platforms = Array.from({length: CONFIG.MAX_PLATFORMS}, () => new Platform());

// =====================
// ENEMIES
// =====================
class Enemy {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.hp = CONFIG.ENEMY_HP;
    }
    spawn(x, y) { this.x = x; this.y = y; this.active = true; this.hp = CONFIG.ENEMY_HP; }
    update() {}
    draw() {
        if (!this.active) return;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY, 30, 30);
    }
}
const enemies = Array.from({length: CONFIG.MAX_ENEMIES}, () => new Enemy());

// =====================
// NFT BOX
// =====================
class NFTBox {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.size = 30;
        this.collected = false;
    }

    spawn(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.collected = false;
    }

    update() {
        if (!this.active || this.collected) return;
        if (player.x + CONFIG.PLAYER_SIZE > this.x &&
            player.x < this.x + this.size &&
            player.y + CONFIG.PLAYER_SIZE > this.y &&
            player.y < this.y + this.size) {
            this.collected = true;
            player.hasNFT = true;
        }
    }

    draw() {
        if (!this.active || this.collected) return;
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText('NFT', this.x + 3, this.y - cameraY + 18);
    }
}
const nftBox = new NFTBox();

// =====================
// SPAWN SYSTEM
// =====================
let maxPlatformY = canvas.height;
function spawnEntities(isReset = false) {
    if (isReset) {
        platforms.forEach(p => p.reset());
        enemies.forEach(e => e.active = false);
        nftBox.active = false;
        player.y = canvas.height - 50;
        cameraY = 0;
        maxPlatformY = canvas.height;
    }

    platforms.forEach(p => {
        if (!p.active) {
            const gap = rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
            const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
            const y = maxPlatformY - gap;
            p.spawn(x, y);
            maxPlatformY = y;

            // Спавним NFT Box с шансом
            if (!nftBox.active && Math.random() < 0.1) {
                nftBox.spawn(x + CONFIG.PLATFORM_WIDTH / 2 - 15, y - 40);
            }
        }
    });
}

// =====================
// PAUSE UI / GAME OVER UI
// =====================
function drawUI() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    if (gameState === GameState.PAUSED) {
        ctx.fillText('ПАУЗА\nНажмите R для продолжения', canvas.width/2, canvas.height/2);
    } else if (gameState === GameState.GAME_OVER) {
        ctx.fillText('GAME OVER\nНажмите R для рестарта', canvas.width/2, canvas.height/2 - 20);
        if (player.hasNFT) {
            ctx.fillText('Нажмите N чтобы вывести NFT', canvas.width/2, canvas.height/2 + 20);
        }
    }
}

// ==== INPUT ====
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') inputX = -1;
    if (e.key === 'ArrowRight') inputX = 1;
    if (e.key === 'p') gameState = (gameState === GameState.PAUSED ? GameState.PLAYING : GameState.PAUSED);
    if (e.key === 'r') restartGame();
    if (e.key === 'n' && gameState === GameState.GAME_OVER && player.hasNFT) {
        alert('NFT выведено!'); // здесь будет вызов mint функции
        player.hasNFT = false;
    }
});
window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') inputX = 0; });

// =====================
// CAMERA
// =====================
function updateCamera() {
    const minY = canvas.height * 0.65;
    const target = Math.min(player.y - minY, cameraY);
    cameraY += (target - cameraY) * 0.18;
}

// =====================
// UPDATE / DRAW
// =====================
function update() {
    if (gameState !== GameState.PLAYING) return;
    player.update(inputX);
    platforms.forEach(p => p.checkCollision(player));
    nftBox.update();
    spawnEntities();
    updateCamera();

    if (player.y - cameraY > canvas.height || player.hp <= 0) {
        gameState = GameState.GAME_OVER;
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    platforms.forEach(p => p.draw());
    enemies.forEach(e => e.draw());
    nftBox.draw();
    player.draw();
    drawUI();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// =====================
// RESTART
// =====================
function restartGame() {
    player.y = canvas.height - 50;
    player.vy = 0;
    player.hp = 100;
    player.hasNFT = false;
    platforms.forEach(p => p.reset());
    enemies.forEach(e => e.active = false);
    nftBox.active = false;
    spawnEntities(true);
    gameState = GameState.PLAYING;
}

spawnEntities(true);
loop();