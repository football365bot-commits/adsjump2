
// В начале game.js
import { PlayerAnchors } from './anchors.js';
// =====================
// CANVAS SETUP
// =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// =====================
// GAME STATE
// =====================
const GameState = {
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};
let gameState = GameState.PLAYING;

// =====================
// GLOBAL STATE
// =====================
let cameraY = 0;
let maxPlatformY = canvas.height;
let inputX = 0;
let lootBoxSpawned = false; // флаг спавна единственного лутбокса

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
    ENEMY_SPAWN_CHANCE: 0.00005,
    ENEMY_SHOOT_INTERVAL: 25,
    ENEMY_DAMAGE: 1,
    ENEMY_HP: 10,
    PLAYER_BULLET_DAMAGE: 1,
    PLAYER_SHOOT_COOLDOWN: 15,
    BULLET_POOL_SIZE: 500,
    BULLET_SPEED: 13,
};

// =====================
// UTILS
// =====================
const rand = (a,b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function isOnScreen(obj) {
    return obj.y - cameraY + (obj.size || CONFIG.ENEMY_SIZE) > 0 &&
           obj.y - cameraY < canvas.height;
}
// =====================
// PLAYER
// =====================
class Player { 
    constructor(){
        this.size = CONFIG.PLAYER_SIZE;
        this.jumpForce = CONFIG.BASE_JUMP_FORCE;
        this.shootCooldown = 0;
        this.hp = 100;

        this.handAnchor = { x: this.size * 0.75, y: this.size * 0.5 };
        this.anim = { tilt: 0, jump: 0, land: 0 };
        this.pipe = { angle: 0, length: 18 };

        this.skinCanvas = null;
        this.equippedItems = {}; // тут будут все аксессуары
        this.reset();
    }

    reset(){
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.vy = 0;
        this.lastY = this.y;
        this.hp = 100;
        this.visualScale = 1;
        this.equippedItems = {}; // сбрасываем все аксессуары
    }

    prepareSkin(baseImage, size = CONFIG.PLAYER_SIZE){
        const skinCanvas = document.createElement('canvas');
        skinCanvas.width = size;
        skinCanvas.height = size;
        const ctx = skinCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(baseImage, 0, 0, baseImage.width, baseImage.height, 0, 0, size, size);
        return skinCanvas;
    }

    equipItem(item){
        // item должен иметь type (например: "glasses") и optional subType ("left", "right")
        // item.image — картинка аксессуара
        this.equippedItems[item.type] = item;
    }

    update(inputX){
        this.lastY = this.y;
        this.x += inputX * 10;
        if(this.x < -this.size) this.x = canvas.width;
        if(this.x > canvas.width) this.x = -this.size;

        this.vy += CONFIG.GRAVITY;
        this.y += this.vy;

        const targetTilt = inputX * 0.25;
        this.anim.tilt += (targetTilt - this.anim.tilt) * 0.15;

        if(this.vy < 0) this.anim.jump = 1;
        this.anim.jump = Math.max(0, this.anim.jump - 0.08);
        if(this.vy > 0 && this.lastY + this.size <= this.y) this.anim.land = 1;
        this.anim.land = Math.max(0, this.anim.land - 0.12);

        // стреляет автоматически
        if(this.shootCooldown <= 0){
            let target = null;
            for(const e of enemies){
                if(e.active && isOnScreen(e)){
                    target = e;
                    break;
                }
            }
            if(target && isOnScreen(this)){
                ShootingSystem.requestShot('player', this, target);
                this.shootCooldown = 10;

                const dx = (target.x + CONFIG.ENEMY_SIZE/2) - (this.x + this.size/2);
                const dy = (target.y + CONFIG.ENEMY_SIZE/2) - (this.y + this.size/2);
                this.pipe.angle = Math.atan2(dy, dx);
            }
        } else this.shootCooldown--;
    }

    draw(cameraY){
        const cx = this.x + this.size / 2;
        const cy = this.y - cameraY + this.size / 2;

        const jumpStretch = Math.sin(this.anim.jump * Math.PI) * 0.25;
        const landSquash = Math.sin(this.anim.land * Math.PI) * 0.2;
        const scaleY = 1 - jumpStretch + landSquash;
        const scaleX = 1 + jumpStretch - landSquash;

        // базовый игрок
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.anim.tilt);
        ctx.scale(scaleX, scaleY);
        if(this.skinCanvas) ctx.drawImage(this.skinCanvas, -this.size/2, -this.size/2, this.size, this.size);
        else { ctx.fillStyle = '#00ff00'; ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size); }
        ctx.restore();

        // трубочка для стрельбы
        ctx.save();
        const handX = this.x + this.handAnchor.x;
        const handY = this.y + this.handAnchor.y - cameraY;
        ctx.translate(handX, handY);
        ctx.rotate(this.pipe.angle);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -2, this.pipe.length, 4);
        ctx.restore();

        // отрисовка аксессуаров
        for(const key in this.equippedItems){
            const item = this.equippedItems[key];
            if(!item.image) continue;

            // вычисляем позицию
            let anchor = PlayerAnchors;
            const parts = key.split('.'); // "head.glasses", "hands.left.glove" и т.д.
            for(const part of parts){
                anchor = anchor[part];
                if(!anchor) break;
            }
            if(!anchor) continue;

            let posX = this.x + anchor.x * this.size;
            let posY = this.y + anchor.y * this.size - cameraY;

            ctx.drawImage(item.image, posX - item.width/2, posY - item.height/2, item.width, item.height);
        }
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
        this.hp = CONFIG.ENEMY_HP;
        this.shootCooldown = 0;
    }

    spawn(x, y, type) {
        this.reset();
        this.x = x;
        this.y = this.baseY = y;
        this.type = type;
        this.active = true;
        const f = ScoreManager.difficultyFactor();
        if(type === 'horizontal') this.vx = (rand(1,2)+2*f)*(Math.random()<0.5?-1:1);
        if(type === 'vertical') { this.vy = rand(1,2)+2*f; this.amplitude = rand(50,120); }
    }

    update() {
        if(!this.active) return;

        if(this.type === 'horizontal') {
            this.x += this.vx;
            if(this.x<0 || this.x+CONFIG.ENEMY_SIZE>canvas.width) this.vx *= -1;
        }
        if(this.type === 'vertical') {
            this.y += this.vy;
            if(this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude) this.vy *= -1;
        }

        if(this.shootCooldown <= 0) {
            if(isOnScreen(this) && isOnScreen(player)) {
                ShootingSystem.requestShot('enemy', this, player);
                this.shootCooldown = CONFIG.ENEMY_SHOOT_INTERVAL;
            }
        } else this.shootCooldown--;

        if(this.y - cameraY > canvas.height || this.hp <= 0) this.active = false;
    }

    draw(cameraY) {
        if(!this.active) return;
        ctx.save();
        ctx.translate(this.x + CONFIG.ENEMY_SIZE/2, this.y - cameraY + CONFIG.ENEMY_SIZE/2);
        ctx.scale(this.visualScale||1, this.visualScale||1);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-CONFIG.ENEMY_SIZE/2, -CONFIG.ENEMY_SIZE/2, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);

        const barWidth = CONFIG.ENEMY_SIZE, barHeight = 4;
        ctx.fillStyle = '#555';
        ctx.fillRect(-barWidth/2, -CONFIG.ENEMY_SIZE/2-6, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-barWidth/2, -CONFIG.ENEMY_SIZE/2-6, barWidth*(this.hp/CONFIG.ENEMY_HP), barHeight);
        ctx.restore();
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

        if(movementType === 'horizontal') this.vx = rand(1,3)*(Math.random()<0.5?-1:1);
        if(movementType === 'vertical') { this.vy = rand(1,2); this.amplitude = rand(CONFIG.MIN_GAP*0.5, CONFIG.MIN_GAP); }

        // spawn обычных предметов
        const newItem = getItemFromPool();
        if(newItem) newItem.spawn(this);

        // spawn единственного LootBox (NFT)
        if(!lootBoxSpawned &&
           ScoreManager.value >= 5000 && ScoreManager.value <= 10000) {
            const lootBox = getItemFromPool();
            if(lootBox) {
                lootBox.type = 'lootbox';
                lootBox.spawn(this);
                lootBoxSpawned = true;
            }
        }
    }

    update() {
        if(!this.active) return;
        this.prevY = this.y;

        if(this.movementType === 'horizontal') {
            this.x += this.vx;
            if(this.x < 0 || this.x + CONFIG.PLATFORM_WIDTH > canvas.width) this.vx *= -1;
        }
        if(this.movementType === 'vertical') {
            this.y += this.vy;
            if(this.y > this.baseY + this.amplitude || this.y < this.baseY - this.amplitude) this.vy *= -1;
        }

        if(this.y - cameraY > canvas.height) this.active = false;
    }

    draw(cameraY) {
        if(!this.active) return;
        ctx.fillStyle = this.isBroken ? '#f44' :
                       this.movementType==='vertical' ? '#88f' :
                       this.movementType==='horizontal' ? '#0ff' : '#0f8';
        ctx.fillRect(this.x, this.y - cameraY, CONFIG.PLATFORM_WIDTH, CONFIG.PLATFORM_HEIGHT);
    }

    checkCollision(player) {
        if(!this.active) return false;
        const prevBottom = player.lastY + player.size;
        const currBottom = player.y + player.size;

        if(player.vy > 0 &&
           prevBottom <= this.prevY + CONFIG.PLATFORM_HEIGHT &&
           currBottom >= this.prevY &&
           player.x + player.size > this.x &&
           player.x < this.x + CONFIG.PLATFORM_WIDTH) {

            if(this.isBroken) {
                if(this.used) return false;
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
// ITEM
// =====================
class Item {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.size = 20;
        this.type = null;
        this.platform = null;
    }

    spawn(platform) {
        if(!platform) return;

        if(this.type !== 'lootbox') { // обычные предметы
            const r = Math.random();
            if(r<0.0003) this.type='rocket';
            else if(r<0.0007) this.type='drone';
            else if(r<0.0014) this.type='trampoline';
            else if(r<0.0018) this.type='bomb';
            else if(r<0.0025) this.type='spikes';
            else if(r<0.004) this.type='adrenaline';
            else if(r<0.007) this.type='medkit';
            else return;
        }

        this.active = true;
        this.platform = platform;
        this.x = platform.x + CONFIG.PLATFORM_WIDTH/2 - this.size/2;
        this.y = platform.y - this.size;
    }

    update() {
        if(!this.active) return;

        if(!this.platform || !this.platform.active) {
            this.active = false;
            this.platform = null;
            return;
        }

        this.x = this.platform.x + CONFIG.PLATFORM_WIDTH/2 - this.size/2;
        this.y = this.platform.y - this.size;

        if(player.x + CONFIG.PLAYER_SIZE > this.x &&
           player.x < this.x + this.size &&
           player.y + CONFIG.PLAYER_SIZE > this.y &&
           player.y < this.y + this.size) {

            if(this.type === 'lootbox') player.hasLootBox = true;

            switch(this.type){
                case 'trampoline': player.vy -=5; break;
                case 'drone': player.vy -=35; break;
                case 'rocket': player.vy -=75; break;
                case 'spikes': player.hp -=1; break;
                case 'bomb': player.hp -=5; break;
                case 'medkit': player.hp = Math.min(player.hp+1,100); break;
                case 'adrenaline': player.hp = Math.min(player.hp+5,100); break;
            }

            this.active = false;
            this.platform = null;
        }
    }

    draw() {
        if(!this.active) return;
        let color = '#fff';
        switch(this.type){
            case 'trampoline': color='#ff0'; break;
            case 'drone': color='#f80'; break;
            case 'rocket': color='#f00'; break;
            case 'spikes': color='#888'; break;
            case 'bomb': color='#000'; break;
            case 'medkit': color='#0f0'; break;
            case 'adrenaline': color='#f0f'; break;
            case 'lootbox': color='#ff00ff'; break;
        }
        ctx.fillStyle=color;
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
    }
}

// ===================== BLACK HOLE
// =====================
class BlackHole {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.radius = 120;
        this.size = 50;
        this.pullStrength = 0.4;
    }

    spawn(x,y,radius=120,strength=0.8){
        this.active = true;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.pullStrength = strength;
    }

    update(){
        if(!this.active) return;
        const objects = [...enemies, player];
        objects.forEach(obj=>{
            if(obj !== player && !obj.active) return;
            const objSize = obj.size || CONFIG.ENEMY_SIZE;
            const dx = this.x - (obj.x + objSize/2);
            const dy = this.y - (obj.y + objSize/2);
            const dist = Math.hypot(dx, dy);
            if(dist < this.radius){
                const strength = this.pullStrength * (1 + (this.radius-dist)/this.radius*4);
                const angle = Math.atan2(dy, dx) + 0.1;
                const pullX = Math.cos(angle) * strength;
                const pullY = Math.sin(angle) * strength;
                obj.x += pullX;
                obj.y += pullY;
                obj.visualScale = Math.max(0.5, dist / this.radius);
                if(dist<5) obj.active = false;
                if(obj===player && dist<10) gameState = GameState.GAME_OVER;
            } else obj.visualScale=1;
        });
    }

    draw(cameraY){
        if(!this.active) return;
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x, this.y-cameraY, this.size, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

// ===================== BULLETS / SHOOTING
// =====================
const ShootingSystem = {
    requests: [],
    requestShot(owner, shooter, target){ this.requests.push({owner, shooter, target}); },
    processShots(){
        this.requests.forEach(req=>{
            const bullet = getBullet();
            if(!bullet) return;
            const dx = (req.target.x+CONFIG.ENEMY_SIZE/2) - (req.shooter.x+CONFIG.PLAYER_SIZE/2);
            const dy = (req.target.y+CONFIG.ENEMY_SIZE/2) - (req.shooter.y+CONFIG.PLAYER_SIZE/2);
            const dist = Math.hypot(dx, dy)||1;
            bullet.active = true;
            bullet.owner = req.owner;
            bullet.x = req.shooter.x + CONFIG.PLAYER_SIZE/2;
            bullet.y = req.shooter.y + CONFIG.PLAYER_SIZE/2;
            bullet.vx = dx/dist * bullet.speed;
            bullet.vy = dy/dist * bullet.speed;
        });
        this.requests = [];
    }
};

function getBullet(){ for(const b of bulletPool) if(!b.active) return b; return null; }
function updateBullets(){
    for(const b of bulletPool){
        if(!b.active) continue;
        b.x += b.vx;
        b.y += b.vy;

        if(b.x<0||b.x>canvas.width||b.y-cameraY<0||b.y-cameraY>canvas.height){
            b.active = false;
            continue;
        }

        if(b.owner==='player'){
            for(const e of enemies){
                if(!e.active) continue;
                if(b.x>e.x && b.x<e.x+CONFIG.ENEMY_SIZE && b.y>e.y && b.y<e.y+CONFIG.ENEMY_SIZE){
                    e.hp -= CONFIG.PLAYER_BULLET_DAMAGE;
                    b.active = false;
                    if(e.hp<=0) e.active=false;
                    break;
                }
            }
        }

        if(b.owner==='enemy'){
            if(b.x>player.x && b.x<player.x+CONFIG.PLAYER_SIZE && b.y>player.y && b.y<player.y+CONFIG.PLAYER_SIZE){
                player.hp -= CONFIG.ENEMY_DAMAGE;
                b.active=false;
            }
        }
    }
}

function drawBullets(){ for(const b of bulletPool) if(b.active){ ctx.fillStyle=b.owner==='player'?'#ff0':'#f80'; ctx.fillRect(b.x-2,b.y-cameraY-1,2,2); } }
function updateItems(){ itemPool.forEach(i=>i.update()); }
function drawItems(){ itemPool.forEach(i=>i.draw()); }

// ===================== SCORE
// =====================
const ScoreManager={
    value:0,
    maxY:null,
    update(p){
        if(this.maxY===null || p.y<this.maxY){
            if(this.maxY!==null) this.value += this.maxY - p.y;
            this.maxY = p.y;
        }
    },
    reset(){ this.value=0; this.maxY=null; },
    difficultyFactor(){ return this.value/2000; }
};

// ===================== SPAWN ENTITIES
// =====================
let lastEnemyScore = 0, lastBlackHoleScore = 0;

function getBlackHoleFromPool(){ for(const bh of blackHolePool) if(!bh.active) return bh; return null; }
function getItemFromPool(){ for(const i of itemPool) if(!i.active) return i; return null; }

function spawnEntities(isReset=false){
    const factor = ScoreManager.difficultyFactor();

    if(!isReset && platforms.every(p=>p.active)) return;

    if(isReset){
        maxPlatformY = canvas.height;
        platforms.forEach(p=>p.reset());
        enemies.forEach(e=>e.reset());
        const start = platforms[0];
        const x = canvas.width/2 - CONFIG.PLATFORM_WIDTH/2;
        const y = canvas.height - 50;
        start.spawn(x,y,'static',false);
        player.y = y - player.size;
        maxPlatformY = y;
        lastEnemyScore = 0;
        lootBoxSpawned = false; // сброс флага при рестарте
    }

    platforms.forEach(p=>{
        if(!p.active){
            const growth = 1 + factor*0.08;
            const minGap = Math.min(85*growth,95);
            const maxGap = Math.min(100*growth,110);
            const gap = rand(minGap,maxGap);
            const x = rand(0,canvas.width-CONFIG.PLATFORM_WIDTH);
            const y = maxPlatformY - gap;
            const types=['static'];
            if(Math.random()<0.15+0.7*factor) types.push('horizontal');
            if(Math.random()<0.12*factor) types.push('vertical');
            p.spawn(x,y,pick(types), Math.random()<0.1);
            maxPlatformY=y;
        }
    });

    const SCORE_STEP=500 + Math.random()*500;
    if(ScoreManager.value - lastEnemyScore >= SCORE_STEP){
        const e = enemies.find(e=>!e.active);
        if(e){
            const x = rand(0,canvas.width-CONFIG.ENEMY_SIZE);
            const y = cameraY - CONFIG.ENEMY_SIZE;
            e.spawn(x,y,pick(['static','horizontal','vertical']));
            e.hp = CONFIG.ENEMY_HP;
            lastEnemyScore = ScoreManager.value;
        }
    }

    if(ScoreManager.value - lastBlackHoleScore >= 1500){
        const bh = getBlackHoleFromPool();
        if(bh){
            const x = rand(50,canvas.width-50);
            const y = player.y - rand(400,800);
            const radius = rand(80,120);
            const strength = rand(0.8,1.5);
            bh.spawn(x,y,radius,strength);
            lastBlackHoleScore = ScoreManager.value;
        }
    }
}

// ===================== CAMERA
// =====================
function updateCamera(){
    const minY = canvas.height*0.65;
    const target = Math.min(player.y - minY, cameraY);
    cameraY += (target - cameraY) * 0.18;
}

// ===================== GLOBAL OBJECTS
// =====================
const player = new Player();
const platforms = Array.from({length:CONFIG.MAX_PLATFORMS},()=>new Platform());
const enemies = Array.from({length:CONFIG.MAX_ENEMIES},()=>new Enemy());
const itemPool = Array.from({length:CONFIG.MAX_ITEMS},()=>new Item());
const bulletPool = Array.from({length:CONFIG.BULLET_POOL_SIZE},()=>({active:false,x:0,y:0,vx:0,vy:0,speed:CONFIG.BULLET_SPEED,damage:CONFIG.PLAYER_BULLET_DAMAGE,owner:null}));
const MAX_BLACKHOLES=3;
const blackHolePool = Array.from({length:MAX_BLACKHOLES},()=>new BlackHole());

// ===================== PLAYER SKIN
// =====================
const bg = new Image();
bg.src = 'background.jpg';
const playerSkin = new Image();
playerSkin.src = 'adsjump.png';
playerSkin.onload = ()=>{ player.skinCanvas = player.prepareSkin(playerSkin, CONFIG.PLAYER_SIZE); };

// ===================== INPUT
// =====================
function handleInput(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    if(gameState === GameState.PLAYING){
        inputX = x < canvas.width/2 ? -1 : 1;
        return;
    }

    if(gameState === GameState.GAME_OVER){
        const centerX = canvas.width/2;
        const centerY = canvas.height/2;
        const buttonWidth = 180;
        const buttonHeight = 50;
        const gap = 20;

        const restartX = centerX - buttonWidth - gap/2;
        const restartY = centerY;
        const nftX = centerX + gap/2;
        const nftY = centerY;

        // кнопка "Играть заново"
        if(x>restartX && x<restartX+buttonWidth &&
           y>restartY && y<restartY+buttonHeight){
            restartGame();
            gameState = GameState.PLAYING;
            return;
        }

        // кнопка "Вывести NFT"
        if(player.hasLootBox &&
           x>nftX && x<nftX+buttonWidth &&
           y>nftY && y<nftY+buttonHeight){
            console.log("Mint NFT triggered!");
            player.hasLootBox = false; // после минта лутбокс снимается
            return;
        }
    }
}

// Навешиваем события
canvas.addEventListener('click', e=>handleInput(e.clientX,e.clientY));
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.touches[0]; handleInput(t.clientX,t.clientY); }, {passive:false});
canvas.addEventListener('touchend', e=>{ e.preventDefault(); inputX=0; }, {passive:false});

// ===================== GAME LOOP
// =====================
spawnEntities(true);

function update(){
    if(gameState !== GameState.PLAYING) return;

    player.update(inputX);
    platforms.forEach(p=>{ p.update(); p.checkCollision(player); });
    enemies.forEach(e=>e.update());
    spawnEntities();
    updateItems();
    blackHolePool.forEach(bh=>bh.update());
    ShootingSystem.processShots();
    updateBullets();
    ScoreManager.update(player);

    updateCamera();

    if(player.y - cameraY > canvas.height || player.hp<=0){
        if(gameState !== GameState.GAME_OVER){
            ScoreManager.update(player);
            gameState = GameState.GAME_OVER;
        }
    }
}

function restartGame(){
    player.reset();
    ScoreManager.reset();
    cameraY=0;
    bulletPool.forEach(b=>b.active=false);
    enemies.forEach(e=>e.reset());
    platforms.forEach(p=>p.reset());
    itemPool.forEach(i=>i.active=false);
    lootBoxSpawned=false;
    spawnEntities(true);
}

function draw(){
    if(bg.complete){
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    }
    platforms.forEach(p=>p.draw(cameraY));
    enemies.forEach(e=>e.draw(cameraY));
    drawItems();
    player.draw(cameraY);
    drawBullets();

    ctx.fillStyle='#fff'; ctx.font='20px Arial';
    const centerX = canvas.width/2;
    ctx.textAlign='right'; ctx.fillText(`${Math.floor(ScoreManager.value)}`, centerX-10,30);
    ctx.textAlign='left'; ctx.fillText(`HP: ${player.hp}`, centerX+10,30);

    blackHolePool.forEach(bh=>bh.draw(cameraY));
}

function drawGameOverUI() {
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0); // сброс всех трансформаций камеры

    const centerX = canvas.width/2;
    const centerY = canvas.height/2;

    // затемнённый фон
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // надпись GAME OVER
    ctx.fillStyle='#fff';
    ctx.font='40px Arial';
    ctx.textAlign='center';
    ctx.fillText('GAME OVER', centerX, centerY-80);

    // новый: отображение счёта
    ctx.font='32px Arial';
    ctx.fillText(`Score: ${Math.floor(ScoreManager.value)}`, centerX, centerY-30);

    const buttonWidth=180, buttonHeight=50, gap=20;
    const restartX=centerX-buttonWidth-gap/2, restartY=centerY;
    const nftX=centerX+gap/2, nftY=centerY;

    // кнопка "Играть заново"
    ctx.fillStyle='#00ff00';
    ctx.fillRect(restartX, restartY, buttonWidth, buttonHeight);
    ctx.fillStyle='#000';
    ctx.font='24px Arial';
    ctx.fillText('Играть заново', restartX+buttonWidth/2, restartY+buttonHeight/2+8);

    // кнопка "Вывести NFT"
    ctx.fillStyle=player.hasLootBox?'#ffcc00':'#555';
    ctx.fillRect(nftX, nftY, buttonWidth, buttonHeight);
    ctx.fillStyle='#000';
    ctx.fillText('Вывести NFT', nftX+buttonWidth/2, nftY+buttonHeight/2+8);

    ctx.restore();
}

function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    update();
    draw();
    if(gameState === GameState.GAME_OVER) drawGameOverUI();
    requestAnimationFrame(loop);
}
loop();
