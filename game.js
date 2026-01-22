
import { PauseUI, GameState } from './pause.js';

// =====================
// CANVAS SETUP
// =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');


const pauseUI = new PauseUI(canvas, ctx, {
    onPause() {
        gameState = GameState.PAUSED;
    },
    onResume(delta) {
        pausedTime += delta;   // учёт времени паузы
        gameState = GameState.PLAYING;
    },
    onMenu() {
        gameState = GameState.MENU;
        // например, сбросить игру
        player.reset();
        ScoreManager.reset();
        cameraY = 0;
        bulletPool.forEach(b => b.active = false);
        spawnEntities(true);
        startTime = Date.now();
    }
});

// Клик мышкой
canvas.addEventListener('click', e => {
    handleInput(e.clientX, e.clientY);
});

// Touch start
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
}, { passive: false });

// Touch end
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    inputX = 0; // отпустил — останавливаем движение игрока
}, { passive: false });

// === функция обработки клика / тача ===
function handleInput(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Сначала проверяем кнопку паузы
    if (pauseUI.handleClick(x, y, gameState)) return;

    // Если игра не PLAYING — клики по игре игнорируем
    if (gameState !== GameState.PLAYING) return;

    // ---- движение игрока ----
    // Допустим, левая половина экрана = влево, правая = вправо
    if (x < canvas.width / 2) inputX = -1;
    else inputX = 1;
}
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
    MAX_GAP: 100,
    MAX_PLATFORMS: 18,
    ENEMY_SIZE: 30,
    MAX_ENEMIES: 5,
    MAX_ITEMS: 7,

    // --- враги ---
    ENEMY_SPAWN_CHANCE: 0.00005,
    ENEMY_SHOOT_INTERVAL: 25,   // кадры между выстрелами врага
    ENEMY_DAMAGE: 1,            // урон врага
    ENEMY_HP: 10,                // здоровье врага

    // --- игрок ---
    PLAYER_BULLET_DAMAGE: 1,    // урон игрока
    PLAYER_SHOOT_COOLDOWN: 15,   // кадры между выстрелами

    // --- пули ---
    BULLET_POOL_SIZE: 500,
    BULLET_SPEED: 13,
}; 


// =====================
// UTILS
// =====================
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function isOnScreen(obj) {
    return obj.y - cameraY + (obj.size || CONFIG.ENEMY_SIZE) > 0 && obj.y - cameraY < canvas.height;
}

// =====================
// GLOBAL STATE
// =====================
let cameraY = 0;
let maxPlatformY = canvas.height;
let startTime = Date.now();
let gameState = GameState.PLAYING;  // состояние игры
let displayedTime = 0;
let inputX = 0;

function updateDisplayedTime() {
    if (gameState === GameState.PLAYING) {
        displayedTime = Date.now() - startTime;
    }
}

function formatElapsedTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`

}
// =====================
// BULLET POOL
// =====================
const bulletPool = Array.from({ length: CONFIG.BULLET_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: CONFIG.BULLET_SPEED,
    damage: CONFIG.PLAYER_BULLET_DAMAGE,
    owner: null
}));

function getBullet() {
    for (const b of bulletPool) if (!b.active) return b;
    return null;
}

function updateBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;

        b.x += b.vx;
        b.y += b.vy;

        // если пуля вышла за экран — возвращаем в пул
        if (b.x < 0 || b.x > canvas.width || b.y - cameraY < 0 || b.y - cameraY > canvas.height) {
            b.active = false;
            continue;
        }

        // игрок стреляет по врагам
        if (b.owner === 'player') {
            for (const e of enemies) {
                if (!e.active) continue;
                if (b.x > e.x && b.x < e.x + CONFIG.ENEMY_SIZE &&
                    b.y > e.y && b.y < e.y + CONFIG.ENEMY_SIZE) {
                    e.hp -= CONFIG.PLAYER_BULLET_DAMAGE;
                    b.active = false;
                    if (e.hp <= 0) e.active = false;
                    break;
                }
            }
        }

        // враг стреляет по игроку
        if (b.owner === 'enemy') {
            if (b.x > player.x && b.x < player.x + CONFIG.PLAYER_SIZE &&
                b.y > player.y && b.y < player.y + CONFIG.PLAYER_SIZE) {
                player.hp -= CONFIG.ENEMY_DAMAGE;
                b.active = false;
            }
        }
    }
}

function drawBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;
        ctx.fillStyle = b.owner === 'player' ? '#ffff00' : '#ff8800';
        ctx.fillRect(b.x - 2, b.y - cameraY - 1, 2, 2);
    }
}
const ShootingSystem = {
    requests: [], // очередь выстрелов
    requestShot(owner, shooter, target) {
        // просто сохраняем запрос на выстрел
        this.requests.push({ owner, shooter, target });
    },
    processShots() {
        // обрабатываем все запросы и создаем пули
        this.requests.forEach(req => {
            const bullet = getBullet();
            if (!bullet) return;

            const dx = (req.target.x + CONFIG.ENEMY_SIZE / 2) - (req.shooter.x + CONFIG.PLAYER_SIZE / 2);
            const dy = (req.target.y + CONFIG.ENEMY_SIZE / 2) - (req.shooter.y + CONFIG.PLAYER_SIZE / 2);
            const dist = Math.hypot(dx, dy) || 1;

            bullet.active = true;
            bullet.owner = req.owner;
            bullet.x = req.shooter.x + CONFIG.PLAYER_SIZE / 2;
            bullet.y = req.shooter.y + CONFIG.PLAYER_SIZE / 2;
            bullet.vx = dx / dist * bullet.speed;
            bullet.vy = dy / dist * bullet.speed;
        });
        this.requests = []; // чистим очередь
    }
};
// =====================
// PLAYER
// =====================
class Player {
    constructor() {
        this.size = CONFIG.PLAYER_SIZE;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.shootCooldown = 0;
        this.hp = 100;
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

        // ---- Fire Logic ----
        if (this.shootCooldown <= 0) {
            // находим активного врага на экране
            const target = enemies.find(e => e.active && isOnScreen(e));
            if (target && isOnScreen(this)) {
                ShootingSystem.requestShot('player', this, target);
                this.shootCooldown = 10; // 6 выстрелов в секунду
            }
        } else {
            this.shootCooldown--;
        }
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
    constructor() {
        this.shootCooldown = 0;
        this.reset();
    }

    reset() {
        this.x = this.y = this.vx = this.vy = this.amplitude = this.baseY = 0;
        this.type = 'static';
        this.active = false;
        this.hp = 50;
        this.shootCooldown = 0;
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

        // движение
        if (this.type === 'horizontal') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.ENEMY_SIZE > canvas.width) this.vx *= -1;
        }
        if (this.type === 'vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude)
                this.vy *= -1;
        }

        // ---- Fire Logic ----
        if (this.shootCooldown <= 0) {
            if (isOnScreen(this) && isOnScreen(player)) {
                ShootingSystem.requestShot('enemy', this, player);
                this.shootCooldown = CONFIG.ENEMY_SHOOT_INTERVAL;
            }
        } else {
            this.shootCooldown--;
        }

        if (this.y - cameraY > canvas.height || this.hp <= 0) this.active = false;
    }

    draw(cameraY) {
        if (!this.active) return;

        // тело врага
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);

        // HP-бар сверху
        const barWidth = CONFIG.ENEMY_SIZE;
        const barHeight = 4;
        ctx.fillStyle = '#555'; // фон полоски
        ctx.fillRect(this.x, this.y - cameraY - 6, barWidth, barHeight);
        ctx.fillStyle = '#00ff00'; // сам HP
        ctx.fillRect(this.x, this.y - cameraY - 6, barWidth * (this.hp / CONFIG.ENEMY_HP), barHeight);
    }
}

// =====================
// PLATFORMS
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
        if (movementType === 'horizontal') this.vx = rand(1, 3) * (Math.random() < 0.5 ? -1 : 1);
        if (movementType === 'vertical') { this.vy = rand(1, 2); this.amplitude = rand(CONFIG.MIN_GAP * 0.5, CONFIG.MIN_GAP); }
        const newItem = getItemFromPool();
        if (newItem) newItem.spawn(this);
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
        ctx.fillStyle = this.isBroken ? '#ff4444' : this.movementType === 'vertical' ? '#8888ff' : this.movementType === 'horizontal' ? '#00ffff' : '#00ff88';
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
            if (this.isBroken) { if (this.used) return false; this.used = true; this.active = false; }
            player.vy = -player.jumpForce;
            return true;
        }
        return false;
    }
}

// =====================
// ITEM 
// =====================
class Item {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.size = 20;
        this.type = null;
        this.platform = null; // платформа, на которой предмет "висит"
    }

    spawn(platform) {
        if (!platform) return;

        const rand = Math.random();
        if (rand < 0.0003) this.type = 'rocket';
        else if (rand < 0.0007) this.type = 'drone';
        else if (rand < 0.0014) this.type = 'trampoline';
        else if (rand < 0.0018) this.type = 'bomb';
        else if (rand < 0.0025) this.type = 'spikes';
        else if (rand < 0.0040) this.type = 'adrenaline';
        else if (rand < 0.0070) this.type = 'medkit';
        else return; // шанс не прошёл — предмет не создаём

        this.active = true;
        this.platform = platform;
        this.x = platform.x + CONFIG.PLATFORM_WIDTH / 2 - this.size / 2;
        this.y = this.y = platform.y - this.size;
    }

    update() {
        if (!this.active) return;
        if (!this.platform || !this.platform.active) {
            this.active = false;
            this.platform = null;
            return;
        }

        // движемся вместе с платформой
        this.x = this.platform.x + CONFIG.PLATFORM_WIDTH / 2 - this.size / 2;
        this.y = this.platform.y - this.size;

        // проверка столкновения с игроком
        if (
            player.x + CONFIG.PLAYER_SIZE > this.x &&
            player.x < this.x + this.size &&
            player.y + CONFIG.PLAYER_SIZE > this.y &&
            player.y < this.y + this.size
        ) {
            switch(this.type) {
                case 'trampoline': player.vy -= 5; break;
                case 'drone': player.vy -= 35; break;
                case 'rocket': player.vy -= 75; break;
                case 'spikes': player.hp -= 1; break;
                case 'bomb': player.hp -= 5; break;
                case 'medkit': player.hp = Math.min(player.hp + 1, 100); break;
                case 'adrenaline': player.hp = Math.min(player.hp + 5, 100); break;
            }
            this.active = false;
            this.platform = null;
        }
    }

    draw() {
        if (!this.active) return;
        let color = '#fff';
        switch(this.type) {
            case 'trampoline': color = '#ffff00'; break;
            case 'drone': color = '#ff8800'; break;
            case 'rocket': color = '#ff0000'; break;
            case 'spikes': color = '#888888'; break;
            case 'bomb': color = '#000000'; break;
            case 'medkit': color = '#00ff00'; break;
            case 'adrenaline': color = '#ff00ff'; break;
        }
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}


function updateItems() { itemPool.forEach(i => i.update()); }
// =====================
// GAME STATE
// =====================
const player = new Player();
const platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
const enemies = Array.from({ length: CONFIG.MAX_ENEMIES }, () => new Enemy());
const itemPool = Array.from({ length: CONFIG.MAX_ITEMS }, () => new Item());
function getItemFromPool() {
    for (const item of itemPool) {
        if (!item.active) return item;
    }
    return null;
}
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
    reset() { this.value = 0; this.maxY = null; },
    difficultyFactor() { return this.value / 2000; }
};

// =====================
// SPAWN ENTITIES
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

            const factor = ScoreManager.difficultyFactor();

            const growth = 1 + factor * 0.08;
            // ↑ 0.15 — скорость роста (очень медленно)

            const minGap = Math.min(85 * growth, 95);
            const maxGap = Math.min(100 * growth, 105);

            const gap = rand(minGap, maxGap);

            const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
            const y = maxPlatformY - gap;
    
            const types = ['static'];
            if (Math.random() < 0.15 + 0.7 * factor) types.push('horizontal');
            if (Math.random() < 0.12 * factor) types.push('vertical');

            p.spawn(x, y, pick(types), Math.random() < 0.1);
            maxPlatformY = y;
        }
    });

    enemies.forEach(e => {
        if (!e.active && Math.random() < CONFIG.ENEMY_SPAWN_CHANCE + 0.00002 * ScoreManager.difficultyFactor()) {
            const x = rand(0, canvas.width - CONFIG.ENEMY_SIZE);
            const y = cameraY - CONFIG.ENEMY_SIZE; // спаун сверху экрана
            e.spawn(x, y, pick(['static', 'horizontal', 'vertical']));
            e.hp = CONFIG.ENEMY_HP; // задаем HP из конфига
        }
    });
}


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
    platforms.forEach(p => { p.update(); p.checkCollision(player); });
    enemies.forEach(e => e.update());
    spawnEntities();
    updateItems();
    

    // обработка выстрелов через систему
    ShootingSystem.processShots();

    // обновление пуль
    updateBullets();

    // обновление счета и камеры
    ScoreManager.update(player);
    updateCamera();

    // проверка падения игрока
    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        player.reset();
        ScoreManager.reset();
        cameraY = 0;
        bulletPool.forEach(b => b.active = false);
        spawnEntities(true);
        startTime = Date.now();
    }
}



function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw(cameraY));
    enemies.forEach(e => e.draw(cameraY));
    drawItems();
    player.draw(cameraY);
    drawBullets();

    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';

    const centerX = canvas.width / 2;

    // Score — чуть левее центра
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(ScoreManager.value)}`, centerX - 10, 30);

    // HP — чуть правее центра
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${player.hp}`, centerX + 10, 30);

    // Время — просто число, в формате mm:ss
    ctx.textAlign = 'right';
    ctx.fillText(formatElapsedTime(displayedTime), canvas.width - 20, 30);
}

function drawItems() { itemPool.forEach(i => i.draw()); }
function loop() {
    if (gameState === GameState.PLAYING) {
        update();
    }

    draw();
    pauseUI.draw(gameState);
    updateDisplayedTime(); 

    requestAnimationFrame(loop);
}

loop();
