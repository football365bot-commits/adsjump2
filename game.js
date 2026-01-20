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
    MAX_PLATFORMS: 18
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
        this.movementType = 'static'; // 'static', 'horizontal', 'vertical'
        this.isBroken = false;
        this.vx = 0;
        this.vy = 0;
        this.amplitude = 0;
        this.active = false;
        this.used = false; // для сломанных платформ
    }

    spawn(x, y, movementType = 'static', isBroken = false) {
        this.reset();
        this.x = x;
        this.y = y;
        this.prevY = y;
        this.baseY = y;
        this.movementType = movementType;
        this.isBroken = isBroken;
        this.active = true;

        if (movementType === 'horizontal') this.vx = rand(1,3) * (Math.random()<0.5?-1:1);
        if (movementType === 'vertical') {
            this.vy = rand(1,2);
            this.amplitude = rand(CONFIG.MIN_GAP * 0.5, CONFIG.MIN_GAP);
        }
    }

    update() {
        if (!this.active) return;
        this.prevY = this.y;

        // движение платформ
        if (this.movementType === 'horizontal') {
            this.x += this.vx;
            if (this.x < 0 || this.x + CONFIG.PLATFORM_WIDTH > canvas.width) this.vx *= -1;
        }

        if (this.movementType === 'vertical') {
            this.y += this.vy;
            if (this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude) this.vy *= -1;
        }

        // если ушла за экран вниз — деактивируем
        if (this.y - cameraY > canvas.height) this.active = false;
    }

    draw(cameraY) {
        if (!this.active) return;
        ctx.fillStyle = this.isBroken ? '#ff4444' :
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
// GLOBAL STATE
// =====================
const player = new Player();
let platforms = Array.from({ length: CONFIG.MAX_PLATFORMS }, () => new Platform());
let cameraY = 0;           
let maxPlatformY = canvas.height;

// =====================
// SCORE MANAGER
// =====================
const ScoreManager = {
    value: 0,
    maxY: null, // самая высокая точка игрока

    update(player) {
        if (this.maxY === null || player.y < this.maxY) {
            if (this.maxY !== null) {
                this.value += this.maxY - player.y;
            }
            this.maxY = player.y;
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
// PLATFORM SPAWN
// =====================
function spawnPlatform(p) {
    const gap = rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
    const x = rand(0, canvas.width - CONFIG.PLATFORM_WIDTH);
    const y = maxPlatformY - gap;

    // --- новый блок вместо types ---
    // Сначала выбираем движение
    const movementTypes = ['static'];
    if (Math.random() < 0.3 + 0.7 * ScoreManager.difficultyFactor()) movementTypes.push('horizontal');
    if (Math.random() < 0.2 * ScoreManager.difficultyFactor()) movementTypes.push('vertical');
    const movementType = pick(movementTypes);

    // Случайно определяем, будет ли платформа ломаться
    const isBroken = Math.random() < 0.1;

    // Вызываем spawn с новыми параметрами
    p.spawn(x, y, movementType, isBroken);

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
// CAMERA UPDATE
// =====================
function updateCamera() {
    const minY = canvas.height * 0.65;
    const targetY = Math.min(player.y - minY, cameraY);
    cameraY += (targetY - cameraY) * 0.18; // всегда плавно вверх
}



// =====================
// GAME LOOP
// =====================
function update() {
    player.update(inputX);

    platforms.forEach(p => {
        p.update();
        p.checkCollision(player);
        if (!p.active) spawnPlatform(p);
    });

    ScoreManager.update(player);
    updateCamera();

    // Game Over
    if (player.y - cameraY > canvas.height) {
        alert('Game Over');
        player.reset();
        initPlatforms();
        cameraY = 0;
        ScoreManager.reset();
    }
}


function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => p.draw(cameraY));
    player.draw(cameraY);

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