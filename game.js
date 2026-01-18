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
const GRAVITY = -0.6;
const BASE_JUMP_FORCE = 15;
const PLAYER_SIZE = 40;
const PLATFORM_WIDTH = 65;
const PLATFORM_HEIGHT = 15;
const MIN_GAP = 120;
const MAX_GAP = 160;
const CAMERA_SPEED = 1.25;
const BULLET_SPEED = 12;
const BULLET_SIZE = 4;
const FIRE_RATE = 150;

// =====================
// GAME STATE
// =====================
let lastTime = 0;
let score = 0;

// =====================
// PLAYER
// =====================
const player = {
    x: canvas.width / 2,
    y: canvas.height / 3,
    vy: 0,
    jumpForce: BASE_JUMP_FORCE,
    hp: 100
};

// =====================
// BULLETS
// =====================
const bullets = [];
let lastShotTime = 0;

// =====================
// ENEMIES
// =====================
const enemies = [];

function getEnemyTypeByScore() {
    const rand = Math.random();
    if (rand < 0.001) return 'static';
    if (rand < 0.0008) return 'slow';
    if (rand < 0.0005) return 'fast';
}

function generateInitialEnemies(count) {
    let currentY = 150;
    for (let i = 0; i < count; i++) {
        const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
        const type = getEnemyTypeByScore();
        let vx = 0;
        if (type === 'slow') vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'fast') vx = Math.random() < 0.5 ? 3 : -3;

        enemies.push({
            x: Math.random() * (canvas.width - 30),
            y: currentY,
            vx: vx,
            vy: 0,
            type: type,
            size: 30,
            width: 30,
            height: 30,
            hp: 1,
            damage: 1,
            lastShot: performance.now(),
            bullets: []
        });

        currentY += gap;
    }
}

generateInitialEnemies(10);

// =====================
// PLAYER SKIN
// =====================
const playerImage = new Image();
playerImage.src = 'chiba.png';

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const x = e.touches[0].clientX;
    inputX = x < canvas.width / 2 ? -1 : 1;
});
canvas.addEventListener('touchend', e => { e.preventDefault(); inputX = 0; });

// =====================
// PLATFORMS
// =====================
const platforms = [];

// =====================
// ITEMS
// =====================
const itemTypes = ['trampoline', 'drone', 'rocket', 'bomb', 'spikes', 'medkit', 'adrenaline'];

function getItemForPlatform() {
    const rand = Math.random();
    if (rand < 0.004) return 'rocket';
    if (rand < 0.008) return 'drone';
    if (rand < 0.015) return 'trampoline';
    if (rand < 0.025) return 'bomb';
    if (rand < 0.040) return 'spikes';
    if (rand < 0.050) return 'adrenaline';
    if (rand < 0.075) return 'medkit';
    return null;
}

// =====================
// START PLATFORM
// =====================
function createStartPlatform() {
    platforms.push({
        x: canvas.width / 2 - PLATFORM_WIDTH / 2,
        y: 50,
        type: 'normal',
        vx: 0,
        used: false,
        item: null,
        temp: true,
        lifeTime: 2000,
        spawnTime: performance.now()
    });
}
createStartPlatform();

// =====================
// PLATFORM GENERATION
// =====================
function getPlatformTypeByScore() {
    const normalChance = Math.max(0.6 - score / 10000, 0.2);
    const brokenChance = Math.min(0.2 + score / 15000, 0.4);
    const movingSlowChance = Math.min(0.1 + score / 20000, 0.2);
    const movingFastChance = 1 - normalChance - brokenChance - movingSlowChance;

    const rand = Math.random();
    if (rand < normalChance) return 'normal';
    if (rand < normalChance + brokenChance) return 'broken';
    if (rand < normalChance + brokenChance + movingSlowChance) return 'moving_slow';
    return 'moving_fast';}function generateInitialPlatforms(count) {
    let currentY = 100;for (let i = 0; i < count; i++) {
        const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
        const type = getPlatformTypeByScore();
        let vx = 0;
        if (type === 'moving_slow') vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'moving_fast') vx = Math.random() < 0.5 ? 3 : -3;
        const itemType = getItemForPlatform();
        platforms.push({
            x: Math.random() * (canvas.width - PLATFORM_WIDTH),
            y: currentY,
            type: type,
            vx: vx,
            used: false,
            item: itemType
        });
        currentY += gap;
    }
}
generateInitialPlatforms(20);

// =====================
// UPDATE
// =====================
function update(dt) {
    const now = performance.now();

    // === PLAYER MOVEMENT ===
    player.x += inputX * 8;
    if (player.x < -PLAYER_SIZE) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -PLAYER_SIZE;

    player.vy += GRAVITY;
    player.y += player.vy;

    // === AUTO SHOOT ===
    if (now - lastShotTime > FIRE_RATE) {
        bullets.push({
            x: player.x + PLAYER_SIZE / 2,
            y: player.y,
            vy: BULLET_SPEED
        });
        lastShotTime = now;
    }

    // === BULLETS UPDATE ===
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].vy;
        if (bullets[i].y > canvas.height + 100 || bullets[i].y < -100) bullets.splice(i, 1);
    }

    // === ENEMIES UPDATE ===
    enemies.forEach((enemy, eIndex) => {
        enemy.x += enemy.vx;

        if (enemy.x < 0) enemy.vx = Math.abs(enemy.vx);
        if (enemy.x + enemy.size > canvas.width) enemy.vx = -Math.abs(enemy.vx);

        // === Враг стреляет по игроку ===
        if (performance.now() - enemy.lastShot > 500) { // просто время между выстрелами
            const dx = (player.x + PLAYER_SIZE / 2) - (enemy.x + enemy.size / 2);
            const dy = (player.y + PLAYER_SIZE / 2) - (enemy.y + enemy.size / 2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            const speed = 6;

            enemy.bullets.push({
                x: enemy.x + enemy.size / 2,
                y: enemy.y + enemy.size / 2,
                vx: dx / dist * speed,
                vy: dy / dist * speed,
                size: 6
            });

            enemy.lastShot = performance.now();
        }

        // === Двигаем пули врага и проверяем попадания ===
        for (let i = enemy.bullets.length - 1; i >= 0; i--) {
            const b = enemy.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // коллизия с игроком
            if (player.x + PLAYER_SIZE > b.x && player.x < b.x + b.size &&
                player.y + PLAYER_SIZE > b.y && player.y < b.y + b.size) {
                player.hp -= enemy.damage;
                enemy.bullets.splice(i, 1);
                continue;
            }

            // убираем пули за пределами экрана
            if (
                b.x < 0 ||
                b.x > canvas.width ||
                b.y < 0 ||
                b.y > canvas.height
            ) {
                enemy.bullets.splice(i, 1);
            }
        }

        // collision with bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].x > enemy.x && bullets[i].x < enemy.x + enemy.width &&
                bullets[i].y > enemy.y && bullets[i].y < enemy.y + enemy.height) {
                enemy.hp -= 10;
                bullets.splice(i, 1);
                if (enemy.hp <= 0) enemies.splice(eIndex, 1);
                break;
            }
        }
    });

    // === PLATFORMS UPDATE ===
    platforms.forEach((p, index) => {
        if (p.temp && now - p.spawnTime > p.lifeTime) {
            platforms.splice(index, 1);
            return;
        }

        // collision with player
        if (player.vy < 0 &&
            player.y <= p.y + PLATFORM_HEIGHT &&
            player.y >= p.y &&
            player.x + PLAYER_SIZE > p.x &&
            player.x < p.x + PLATFORM_WIDTH) {

            if (p.type === 'broken' && p.used) return;

            player.vy = player.jumpForce;
            if (p.type === 'broken') p.used = true;

            if (p.item) {
                switch (p.item) {
                    case 'trampoline': player.vy += 5; break;
                    case 'drone': player.vy += 35; break;
                    case 'rocket': player.vy += 75; break;
                    case 'spikes': player.hp -= 1; break;
                    case 'bomb': player.hp -= 5; break;
                    case 'medkit': player.hp = Math.min(player.hp + 1, 100); break;
                    case 'adrenaline': player.hp = Math.min(player.hp + 5, 100); break;
                }
                p.item = null;
            }
        }

        // platform movement
        if (p.type === 'moving_slow') {
            let speed = Math.min(3.5, 1 + score * 0.00005);
            p.vx = Math.sign(p.vx) * speed;
            p.x += p.vx;
        } else if (p.type === 'moving_fast') {
            let speed = Math.min(9, 3.5 + score * 0.00012);
            p.vx = Math.sign(p.vx) * speed;
            p.x += p.vx;
        }

        if (p.x < 0) p.vx = Math.abs(p.vx);
        if (p.x + PLATFORM_WIDTH > canvas.width) p.vx = -Math.abs(p.vx);});

    // === CAMERA ===
    if (player.y > canvas.height / 2) {
        const delta = (player.y - canvas.height / 2) * CAMERA_SPEED;
        player.y = canvas.height / 2;

        platforms.forEach(p => p.y -= delta);
        enemies.forEach(e => e.y -= delta);
        score += Math.floor(delta);
    }

    // === RECYCLE PLATFORMS ===
    let maxY = Math.max(...platforms.map(p => p.y));
    platforms.forEach((p, i) => {
        if (p.y < -PLATFORM_HEIGHT) {
            const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
            const type = getPlatformTypeByScore();
            let vx = 0;
            if (type === 'moving_slow') vx = Math.random() < 0.5 ? 1 : -1;
            if (type === 'moving_fast') vx = Math.random() < 0.5 ? 3 : -3;
            const itemType = getItemForPlatform();

            platforms[i] = {
                x: Math.random() * (canvas.width - PLATFORM_WIDTH),
                y: maxY + gap,
                type: type,
                vx: vx,
                used: false,
                item: itemType
            };
            maxY = platforms[i].y;
        }
    });

    // === SPAWN NEW ENEMIES ===
    let maxEnemyY = Math.max(...enemies.map(e => e.y));
    if (maxEnemyY < platforms[platforms.length - 1].y) {
        const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
        const type = getEnemyTypeByScore();
        let vx = 0;
        if (type === 'slow') vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'fast') vx = Math.random() < 0.5 ? 3 : -3;

        enemies.push({
            x: Math.random() * (canvas.width - 30),
            y: maxEnemyY + gap,
            vx: vx,
            vy: 0,
            type: type,
            size: 30,
            width: 30,
            height: 30,
            hp: 1,
            damage: 10,
            lastShot: performance.now(),
            bullets: []
        });
    }

    if (player.y < -200) location.reload();
}

// =====================
// DRAW
// =====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // player
    ctx.drawImage(playerImage, player.x, canvas.height - player.y, PLAYER_SIZE, PLAYER_SIZE);

    // bullets
    ctx.fillStyle = '#ffff00';
    bullets.forEach(b => ctx.fillRect(b.x - BULLET_SIZE / 2, canvas.height - b.y, BULLET_SIZE, BULLET_SIZE));

    // platforms
    platforms.forEach(p => {
        if (p.type === 'broken' && p.used) return;
        switch (p.type) {
            case 'normal': ctx.fillStyle = '#00ff88'; break;
            case 'broken': ctx.fillStyle = '#ff4444'; break;
            case 'moving_slow': ctx.fillStyle = '#00ffff'; break;
            case 'moving_fast': ctx.fillStyle = '#ff00ff'; break;
        }
        ctx.fillRect(p.x, canvas.height - p.y, PLATFORM_WIDTH, PLATFORM_HEIGHT);

        if (p.item) {
            const itemX = p.x + PLATFORM_WIDTH / 2 - 10;
            const itemY = canvas.height - p.y - 20;
            switch (p.item) {
                case 'trampoline': ctx.fillStyle = '#ffff00'; break;
                case 'drone': ctx.fillStyle = '#ff8800'; break;
                case 'rocket': ctx.fillStyle = '#ff0000'; break;
                case 'spikes': ctx.fillStyle = '#888888'; break;
                case 'bomb': ctx.fillStyle = '#000000'; break;
                case 'medkit': ctx.fillStyle = '#00ff00'; break;
                case 'adrenaline': ctx.fillStyle = '#ff00ff'; break;
            }
            ctx.fillRect(itemX, itemY, 20, 20);
        }
    });

    // enemies
    enemies.forEach(e => {
        switch (e.type) {
            case 'static': ctx.fillStyle = '#ff0000'; break;
            case 'slow': ctx.fillStyle = '#ff8800'; break;
            case 'fast': ctx.fillStyle = '#ffff00'; break;
        }
        ctx.fillRect(e.x, canvas.height - e.y - e.size, e.size, e.size);
        
        ctx.fillStyle = '#ff00ff';
        e.bullets.forEach(b => {
            ctx.fillRect(
                b.x - b.size / 2, 
                canvas.height - b.y - b.size / 2, 
                b.size, 
                b.size
            );
        });   
    });

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.fillText(`HP: ${player.hp}`, canvas.width - 100, 30);
}

// =====================
// GAME LOOP// =====================
function gameLoop(t) {
    const dt = t - lastTime;
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
