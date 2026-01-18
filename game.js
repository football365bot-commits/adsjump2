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

const ENEMY_MAX = {
    static: { speed: 0, damage: 1, hp: 5 },
    slow:   { speed: 3, damage: 2, hp: 7 },
    fast:   { speed: 6, damage: 4, hp: 10 }
};
const MAX_ENEMIES = 5; // уменьшили пул

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
// BULLETS POOL
// =====================
const MAX_BULLETS = 1000; // пул для всех пуль
const bulletPool = Array.from({ length: MAX_BULLETS }, () => ({
    active: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: BULLET_SIZE,
    damage: 0,
    owner: 'player' // или 'enemy'
}));
function spawnBullet(x, y, vx, vy, damage, owner='player') {
    const b = bulletPool.find(b => !b.active);
    if (!b) return; // если пул пуст, пуля не спавнится
    b.active = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.damage = damage;
    b.owner = owner;
}

let lastShotTime = 0;



// =====================
// ENEMIES (пул)
const activeEnemies = [];
const inactiveEnemies = Array.from({ length: MAX_ENEMIES }, () => ({
    active: false,
    x: 0, y: 0, vx: 0, vy: 0,
    type: 'static', size: 30, width: 30, height: 30,
    hp: 0, maxHp: 0, damage: 0, lastShot: 0,
    bullets: []
}));


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
function getPlatformTypeByScore() {
    const normalChance = Math.max(0.6 - score / 10000, 0.2);
    const brokenChance = Math.min(0.2 + score / 15000, 0.4);
    const movingSlowChance = Math.min(0.1 + score / 20000, 0.2);
    const movingFastChance = 1 - normalChance - brokenChance - movingSlowChance;

    const rand = Math.random();
    if (rand < normalChance) return 'normal';
    if (rand < normalChance + brokenChance) return 'broken';
    if (rand < normalChance + brokenChance + movingSlowChance) return 'moving_slow';
    return 'moving_fast';
}

function generateInitialPlatforms(count) {
    let currentY = 100;
    for (let i = 0; i < count; i++) {
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
            used: false,item: itemType
        });
        currentY += gap;
    }
}
generateInitialPlatforms(20);

// =====================
// UTILS
function getEnemyTypeByScore(score) {
    const rand = Math.random();
    if (score < 5000) return rand < 0.7 ? 'static' : 'slow';
    if (score < 20000) return rand < 0.5 ? 'static' : rand < 0.85 ? 'slow' : 'fast';
    return rand < 0.3 ? 'static' : rand < 0.7 ? 'slow' : 'fast';
}

// =====================
// SPAWN ENEMIES (оптимизированно)
let lastEnemySpawn = 0;
function spawnEnemies(score) {
    const now = performance.now();
    if (now - lastEnemySpawn < 500) return; // спавн раз в 0.5 секунды
    lastEnemySpawn = now;

    const spawnChance = 0.005 + Math.min(score / 30000, 0.03);

    // Проверяем, сработал ли спавн
    if (Math.random() > spawnChance) return;

    const enemy = inactiveEnemies.find(e => !e.active);
    if (!enemy) return;

    // Тип врага
    enemy.type = getEnemyTypeByScore(score);

    // Позиция сверху камеры
    const cameraTopY = player.y + canvas.height / 2; // верх камеры
    const spawnOffsetY = Math.random() * 100; // чуть выше
    enemy.y = cameraTopY + spawnOffsetY;

    // Случайная позиция по X
    enemy.x = Math.random() * (canvas.width - enemy.size);

    // Настройка скорости по типу
    if (enemy.type === 'slow') enemy.vx = (Math.random() < 0.5 ? 1 : -1) * (ENEMY_MAX['slow'].speed + score * 0.0001);
    else if (enemy.type === 'fast') enemy.vx = (Math.random() < 0.5 ? 1 : -1) * (ENEMY_MAX['fast'].speed + score * 0.0002);
    else enemy.vx = 0;
    enemy.vy = 0;

    // Характеристики
    enemy.hp = ENEMY_MAX[enemy.type].hp;
    enemy.maxHp = ENEMY_MAX[enemy.type].hp;
    enemy.damage = ENEMY_MAX[enemy.type].damage;
    enemy.lastShot = now;
    enemy.bullets = [];

    enemy.active = true;
    activeEnemies.push(enemy);
}
// =====================
// UPDATE ENEMIES
function updateEnemies(dt) {
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const e = activeEnemies[i];

        // проверка, на экране ли враг
        const onScreen =
            e.y > player.y - canvas.height / 2 &&
            e.y < player.y + canvas.height / 2;

        if (!onScreen) continue;

        e.x += e.vx;
        e.y += e.vy;

        // отражение от стен
        if (e.vx !== 0) {
            if (e.x < 0) e.vx = Math.abs(e.vx);
            if (e.x + e.size > canvas.width) e.vx = -Math.abs(e.vx);
        }

        // авто-стрельба каждые 2 секунды
        if (onScreen && performance.now() - e.lastShot > 2000) {
            const dx = (player.x + PLAYER_SIZE/2) - (e.x + e.size/2);
            const dy = (player.y + PLAYER_SIZE/2) - (e.y + e.size/2);
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;

            spawnBullet(e.x + e.size/2, e.y + e.size/2, dx / dist * 6, dy / dist * 6, e.damage, 'enemy');

                e.lastShot = performance.now();
        }
    

        // движение пуль врагов
        for (let j = e.bullets.length - 1; j >= 0; j--) {
            const b = e.bullets[j];
            b.x += b.vx;
            b.y += b.vy;

            // попадание в игрока
            if (
                b.x > player.x &&
                b.x < player.x + PLAYER_SIZE &&
                b.y > player.y &&
                b.y < player.y + PLAYER_SIZE
            ) {
                player.hp -= b.damage;   // 👈 урон по типу врага
                e.bullets.splice(j, 1);  // 👈 пуля исчезает
                continue;
            }

            // выход за экран
            if (
                b.x < 0 || b.x > canvas.width ||
                b.y < player.y - canvas.height / 2 ||
                b.y > player.y + canvas.height / 2
            ) {
                e.bullets.splice(j, 1);
            }
        }
    }
}

// =====================
// UPDATE GAME
function update(dt) {const now = performance.now();

    // движение игрока
    player.x += inputX * 8;
    if (player.x < -PLAYER_SIZE) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -PLAYER_SIZE;
    player.vy += GRAVITY;
    player.y += player.vy;

    // авто-выстрел игрока (по врагам на экране)
    if (activeEnemies.some(e => e.y < player.y + canvas.height && e.y > player.y - canvas.height) && now - lastShotTime > FIRE_RATE) {
        spawnBullet(player.x + PLAYER_SIZE/2, player.y, 0, BULLET_SPEED, 10, 'player');
        lastShotTime = now;
    }

    // движение пуль игрока
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y += b.vy;
        if (b.y > canvas.height + 100 || b.y < -100) bullets.splice(i, 1);
    }

    // обновляем врагов
    updateEnemies(dt);

    // проверка попаданий игрока по врагам
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let j = activeEnemies.length - 1; j >= 0; j--) {
            const e = activeEnemies[j];
            if (b.x > e.x && b.x < e.x + e.width &&
                b.y > e.y && b.y < e.y + e.height) {
                e.hp -= 10;
                bullets.splice(i, 1);
                if (e.hp <= 0) {
                    e.active = false;
                    activeEnemies.splice(j, 1);
                    inactiveEnemies.push(e);
                }
                break;
            }
        }
    }

    // платформы
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

        // движение платформ
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
        if (p.x + PLATFORM_WIDTH > canvas.width) p.vx = -Math.abs(p.vx);
    });

    // камера
    if (player.y > canvas.height / 2) {
        const delta = (player.y - canvas.height / 2) * CAMERA_SPEED;
        player.y = canvas.height / 2;
        platforms.forEach(p => p.y -= delta);
        activeEnemies.forEach(e => e.y -= delta);
        score += Math.floor(delta);
    }

    // респавн врагов
    spawnEnemies(score);

    // recycle платформ
    let maxY = Math.max(...platforms.map(p => p.y));
    platforms.forEach((p, i) => {
        if (p.y < -PLATFORM_HEIGHT) {
            const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
            const type = getPlatformTypeByScore();
            let vx = 0;
            if (type === 'moving_slow') vx = Math.random() < 0.5 ? 1 : -1;
            if (type === 'moving_fast') vx = Math.random() < 0.5 ? 3 : -3;
            const itemType = getItemForPlatform();
            platforms[i] = { x: Math.random()*(canvas.width-PLATFORM_WIDTH), y:maxY+gap, type, vx, used:false, item:itemType };
            maxY = platforms[i].y;
        }
    });

    // Game over
    if (player.hp <= 0 || player.y < -200) {
        alert('Game Over');
        location.reload();
    }
}

function updateBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;
        b.x += b.vx;
        b.y += b.vy;

        // проверка выхода за экран относительно камеры
        if (
            b.x < 0  b.x > canvas.width 
            b.y < player.y - canvas.height / 2 || b.y > player.y + canvas.height / 2
        ) {
            b.active = false;
            continue;
        }

        // попадание в игрока
        if (b.owner === 'enemy') {
            if (
                b.x > player.x && b.x < player.x + PLAYER_SIZE &&
                b.y > player.y && b.y < player.y + PLAYER_SIZE
            ) {
                player.hp -= b.damage;
                b.active = false;
            }
        }

        // попадание в врагов
        if (b.owner === 'player') {
            for (let i = activeEnemies.length - 1; i >= 0; i--) {
                const e = activeEnemies[i];
                if (b.x > e.x && b.x < e.x + e.size &&
                    b.y > e.y && b.y < e.y + e.size
                ) {
                    e.hp -= b.damage;
                    b.active = false;
                    if (e.hp <= 0) {
                        e.active = false;
                        activeEnemies.splice(i, 1);
                        inactiveEnemies.push(e);
                    }
                    break;
                }
            }
        }
    }
}
// =====================
// DRAW
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

   // player
    ctx.fillStyle = '#00ff00'; // цвет квадрата, можно любой
    ctx.fillRect(player.x, canvas.height - player.y, PLAYER_SIZE, PLAYER_SIZE);

    // bullets
    ctx.fillStyle = '#ffff00';
    bullets.forEach(b => ctx.fillRect(b.x - BULLET_SIZE/2, canvas.height - b.y, BULLET_SIZE, BULLET_SIZE));

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
    activeEnemies.forEach(e => {
        switch(e.type){
            case 'static': ctx.fillStyle='#ff0000'; break;
            case 'slow': ctx.fillStyle='#ff8800'; break;
            case 'fast': ctx.fillStyle='#ffff00'; break;
        }
        ctx.fillRect(e.x, canvas.height - e.y - e.size, e.size, e.size);

        // HP bar
        const hpPercent = e.hp / e.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x, canvas.height - e.y - e.size - 6, e.size, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(e.x, canvas.height - e.y - e.size - 6, e.size * hpPercent, 4);

        ctx.fillStyle = '#ffff00'; // пули игрока
        for (const b of bulletPool) {
            if (!b.active) continue;
            ctx.fillStyle = b.owner === 'player' ? '#ffff00' : '#ff00ff';
            ctx.fillRect(b.x - b.size/2, canvas.height - b.y - b.size/2, b.size, b.size);
    }
    });

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font='20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.fillText(`HP: ${player.hp}`, canvas.width - 100, 30);
}

// =====================
// GAME LOOP
function gameLoop(t){
    const dt = t - lastTime;
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
