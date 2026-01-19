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
const GRAVITY = 0.6;
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

const player = {
    x: canvas.width / 2,
    y: canvas.height / 3,
    vy: 0,
    jumpForce: BASE_JUMP_FORCE,
    hp: 100
};

// =====================
// GAME STATE
// =====================
let lastTime = 0;
let score = 0;
let lastPlayerY = player.y; // важный момент для score
let startedJump = false;
let cameraY = player.y - canvas.height / 2; 
// =====================
// DIFFICULTY SCALE
// =====================
function getDifficulty(score) {
    // Базовая сложность растет с score, плавно
    // min 1, max 3
    return 1 + Math.min(score / 30000, 2);
}

// =====================
// BULLETS POOL
// =====================
const MAX_BULLETS = 500; // пул для всех пуль
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
let maxPlatformY;

function generateInitialPlatforms(count) {
    const START_OFFSET = 0; // расстояние от нижней границы до первой платформы
    let currentY = canvas.height - START_OFFSET;
    for (let i = 0; i < count; i++) {
        const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
        const type = getPlatformTypeByScore();
        let vx = 0;
        if (type === 'moving_slow') vx = Math.random() < 0.5 ? 1 : -1;
        if (type === 'moving_fast') vx = Math.random() < 0.5 ? 3 : -3;
        const itemType = getItemForPlatform();

        currentY -= gap; // поднимаемся вверх

        platforms.push({
            x: Math.random() * (canvas.width - PLATFORM_WIDTH),
            y: currentY,
            type: type,
            vx: vx,
            used: false,
            item: itemType
        });

        // если это первая платформа — ставим игрока на неё
        if (i === 0) {
            player.x = platforms[0].x + PLATFORM_WIDTH/2 - PLAYER_SIZE/2;
            player.y = currentY - PLAYER_SIZE;
        }
    }

    maxPlatformY = Math.min(...platforms.map(p => p.y));
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



function recyclePlatform(p) {
    const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    const type = getPlatformTypeByScore();

    let vx = 0;
    if (type === 'moving_slow') vx = Math.random() < 0.5 ? 1 : -1;
    if (type === 'moving_fast') vx = Math.random() < 0.5 ? 3 : -3;

    p.x = Math.random() * (canvas.width - PLATFORM_WIDTH);
    p.y = maxPlatformY - gap; // <-- используем верхнюю мировую координату
    p.type = type;
    p.vx = vx;
    p.used = false;
    p.item = getItemForPlatform();

    maxPlatformY = p.y; // обновляем верхнюю платформу
}
// =====================
// SPAWN ENEMIES (оптимизированно)
let lastEnemySpawn = 0;
function spawnEnemies(score) {
    const now = performance.now();
    if (now - lastEnemySpawn < 500) return; // спавн раз в 0.5 секунды
    lastEnemySpawn = now;

    const spawnChance = 0.005 + Math.min(score / 30000, 0.05);

    // Проверяем, сработал ли спавн
    if (Math.random() > spawnChance) return;

    const enemy = inactiveEnemies.find(e => !e.active);
    if (!enemy) return;
	
	const difficulty = getDifficulty(score);

    // Тип врага
    enemy.type = getEnemyTypeByScore(score);

    // Позиция сверху камеры
    const cameraTopY = cameraY;
    const spawnOffsetY = Math.random() * 100; // чуть выше
	enemy.y = cameraY - canvas.height - Math.random() * 100;

    // Случайная позиция по X
    enemy.x = Math.random() * (canvas.width - enemy.size);


	// Настройка скорости по типу с учетом difficulty
	if (enemy.type === 'slow') enemy.vx = (Math.random() < 0.5 ? 1 : -1) * (ENEMY_MAX['slow'].speed * difficulty);
	else if (enemy.type === 'fast') enemy.vx = (Math.random() < 0.5 ? 1 : -1) * (ENEMY_MAX['fast'].speed * difficulty);
	else enemy.vx = 0;
	enemy.vy = 0;

	// Характеристики врага с учетом difficulty
	enemy.hp = ENEMY_MAX[enemy.type].hp * difficulty;
	enemy.maxHp = ENEMY_MAX[enemy.type].hp * difficulty;
	enemy.damage = ENEMY_MAX[enemy.type].damage * difficulty;

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
    		e.y > cameraY &&
    		e.y < cameraY + canvas.height;

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
    
	}
}
       


function update(dt) {
    const now = performance.now();

    // движение игрока
    player.x += inputX * 8;
    if (player.x < -PLAYER_SIZE) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -PLAYER_SIZE;
    player.vy += GRAVITY;
    player.y += player.vy;

    // первый прыжок вверх запускает подсчёт score
    if (!startedJump && player.vy < 0) {
        startedJump = true;
        lastPlayerY = player.y; // стартуем отсчёт
    }

    // подсчёт score по мировой позиции игрока
    if (startedJump && player.y < lastPlayerY) {
        score += (lastPlayerY - player.y);
    }
    lastPlayerY = player.y;

    // ===== ПЛАВНАЯ КАМЕРА =====
    const targetCameraY = player.y - canvas.height / 2; 
    cameraY += (targetCameraY - cameraY) * 0.1;

    updateBullets();

    // авто-выстрел игрока по врагам с прицелом
    if (now - lastShotTime > FIRE_RATE) {
        let target = null;
        let minDist = Infinity;

        for (const e of activeEnemies) {
            if (e.y < cameraY || e.y > cameraY + canvas.height) continue;
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dist = dx*dx + dy*dy;
            if (dist < minDist) {
                minDist = dist;
                target = e;
            }
        }

        if (target) {
            const dx = (target.x + target.size/2) - (player.x + PLAYER_SIZE/2);
            const dy = (target.y + target.size/2) - (player.y + PLAYER_SIZE/2);
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;

            const vx = (dx / dist) * BULLET_SPEED;
            const vy = (dy / dist) * BULLET_SPEED;

            spawnBullet(player.x + PLAYER_SIZE/2, player.y + PLAYER_SIZE/2, vx, vy, 10, 'player');
            lastShotTime = now;
        }
    }

    // обновляем врагов

 // =====================
// PLATFORMS UPDATE (OPTIMIZED)
for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];

    // 👉 работаем только с платформами рядом с камерой
    if (
    	p.y < cameraY - 80 || 
    	p.y > cameraY + canvas.height + 80
	) continue;
    // === collision with player ===
    if (
        player.vy > 0 &&
        player.y <= p.y + PLATFORM_HEIGHT &&
        player.y >= p.y &&
        player.x + PLAYER_SIZE > p.x &&
        player.x < p.x + PLATFORM_WIDTH
    ) {
        if (!(p.type === 'broken' && p.used)) {
            player.vy = -player.jumpForce;
            if (p.type === 'broken') p.used = true;

            if (p.item) {
                switch (p.item) {
                    case 'trampoline': player.vy -= 10; break;
                    case 'drone': player.vy -= 35; break;
                    case 'rocket': player.vy -= 75; break;
                    case 'spikes': player.hp -= 1; break;
                    case 'bomb': player.hp -= 5; break;
                    case 'medkit': player.hp = Math.min(player.hp + 1, 100); break;
                    case 'adrenaline': player.hp = Math.min(player.hp + 5, 100); break;
                }
                p.item = null;
            }
        }
    }

    // === movement ===
    if (p.type === 'moving_slow' || p.type === 'moving_fast') {
        p.x += p.vx;
        if (p.x < 0) p.vx = Math.abs(p.vx);
        if (p.x + PLATFORM_WIDTH > canvas.width) p.vx = -Math.abs(p.vx);
    }

    // === recycle ===
    if (p.y > cameraY + canvas.height + PLATFORM_HEIGHT) {
    	recyclePlatform(p);
	}
}

    // респавн врагов
    if (activeEnemies.length < MAX_ENEMIES) {
    	spawnEnemies(score);
	}


    const FALL_LIMIT = cameraY + canvas.height + 20; // нижняя граница видимой зоны + небольшой буфер
    
    if (player.hp <= 0 || player.y > FALL_LIMIT) {
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
    		b.x < 0 || b.x > canvas.width ||
    		b.y < cameraY || b.y > cameraY + canvas.height
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
    ctx.fillRect(player.x, player.y - cameraY, PLAYER_SIZE, PLAYER_SIZE);

    // platforms
    platforms.forEach(p => {
        if (p.type === 'broken' && p.used) return;
        switch (p.type) {
            case 'normal': ctx.fillStyle = '#00ff88'; break;
            case 'broken': ctx.fillStyle = '#ff4444'; break;
            case 'moving_slow': ctx.fillStyle = '#00ffff'; break;
            case 'moving_fast': ctx.fillStyle = '#ff00ff'; break;
        }
        ctx.fillRect(p.x, p.y - cameraY, PLATFORM_WIDTH, PLATFORM_HEIGHT);

        if (p.item) {
            const itemX = p.x + PLATFORM_WIDTH / 2 - 10;
            const itemY = p.y - cameraY - 20;
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
        ctx.fillRect(e.x, e.y - cameraY, e.size, e.size);

        // HP bar
        const hpPercent = e.hp / e.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x, e.y - cameraY - 6, e.size, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(e.x, e.y - cameraY - 6, e.size * hpPercent, 4);
    	
    });

	for (const b of bulletPool) {
        	if (!b.active) continue;
        	ctx.fillStyle = b.owner === 'player' ? '#ffff00' : '#ff00ff';
        	ctx.fillRect(b.x - b.size/2, b.y - cameraY - b.size/2, b.size, b.size);
	}
    // HUD
    ctx.fillStyle = '#fff';
    ctx.font='20px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
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
