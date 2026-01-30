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
let inputX = 0;
let lastTime = performance.now();
let coins = 0;
let score = 0;

// =====================
// INPUT
// =====================
canvas.addEventListener('click', e => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
}, { passive: false });
canvas.addEventListener('touchend', e => { inputX = 0; }, { passive: false });

function handleInput(clientX, clientY) {
    inputX = clientX < canvas.width / 2 ? -1 : 1;
}

// =====================
// BULLET POOL
// =====================
const bulletPool = Array.from({ length: CONFIG.BULLET_POOL_SIZE }, () => ({
    active: false, x:0, y:0, vx:0, vy:0, speed: CONFIG.BULLET_SPEED, damage: CONFIG.PLAYER_BULLET_DAMAGE, owner: null
}));
function getBullet() { for(const b of bulletPool) if(!b.active) return b; return null; }

function updateBullets() {
    for(const b of bulletPool) {
        if(!b.active) continue;
        b.x += b.vx; b.y += b.vy;

        if(b.x <0 || b.x>canvas.width || b.y - cameraY <0 || b.y - cameraY>canvas.height) {
            b.active = false;
            continue;
        }

        if(b.owner==='player') {
            for(const e of enemies) {
                if(!e.active) continue;
                if(b.x>e.x && b.x<e.x+CONFIG.ENEMY_SIZE && b.y>e.y && b.y<e.y+CONFIG.ENEMY_SIZE) {
                    e.hp -= CONFIG.PLAYER_BULLET_DAMAGE; b.active=false;
                    if(e.hp<=0) e.active=false;
                    break;
                }
            }
        }

        if(b.owner==='enemy') {
            if(b.x>player.x && b.x<player.x+CONFIG.PLAYER_SIZE && b.y>player.y && b.y<player.y+CONFIG.PLAYER_SIZE) {
                player.hp -= CONFIG.ENEMY_DAMAGE; b.active=false;
            }
        }
    }
}

function drawBullets() {
    for(const b of bulletPool) {
        if(!b.active) continue;
        ctx.fillStyle = b.owner==='player' ? '#ffff00':'#ff8800';
        ctx.fillRect(b.x-2, b.y-cameraY-1, 2, 2);
    }
}

const ShootingSystem = {
    requests: [],
    requestShot(owner, shooter, target) { this.requests.push({owner, shooter, target}); },
    processShots() {
        this.requests.forEach(req => {
            const bullet = getBullet();
            if(!bullet) return;
            const dx = (req.target.x+CONFIG.ENEMY_SIZE/2)-(req.shooter.x+CONFIG.PLAYER_SIZE/2);
            const dy = (req.target.y+CONFIG.ENEMY_SIZE/2)-(req.shooter.y+CONFIG.PLAYER_SIZE/2);
            const dist = Math.hypot(dx,dy)||1;

            bullet.active = true;
            bullet.owner = req.owner;
            bullet.x = req.shooter.x+CONFIG.PLAYER_SIZE/2;
            bullet.y = req.shooter.y+CONFIG.PLAYER_SIZE/2;
            bullet.vx = dx/dist*bullet.speed;
            bullet.vy = dy/dist*bullet.speed;
        });
        this.requests = [];
    }
};

// =====================
// PLAYER
// =====================
class Player {
    constructor() {
        this.size=CONFIG.PLAYER_SIZE;
        this.jumpForce=CONFIG.BASE_JUMP_FORCE;
        this.shootCooldown=0;
        this.hp=100;
        this.pipe={angle:0,length:18};
        this.reset();
    }
    reset() { this.x=canvas.width/2; this.y=canvas.height-50; this.vy=0; this.lastY=this.y; this.hp=100; this.visualScale=1; }
    update(inputX) {
        this.lastY=this.y;
        this.x+=inputX*10;
        if(this.x<-this.size) this.x=canvas.width;
        if(this.x>canvas.width) this.x=-this.size;
        this.vy+=CONFIG.GRAVITY; this.y+=this.vy;

        if(this.shootCooldown<=0){
            let target = enemies.find(e=>e.active && isOnScreen(e));
            if(target && isOnScreen(this)){
                ShootingSystem.requestShot('player', this, target);
                this.shootCooldown=10;
                const dx=(target.x+CONFIG.ENEMY_SIZE/2)-(this.x+this.size/2);
                const dy=(target.y+CONFIG.ENEMY_SIZE/2)-(this.y+this.size/2);
                this.pipe.angle=Math.atan2(dy,dx);
            }
        } else this.shootCooldown--;
    }
    draw(cameraY){
        ctx.fillStyle='#00ff00';
        ctx.fillRect(this.x,this.y-cameraY,this.size,this.size);

        ctx.save();
        ctx.translate(this.x+this.size/2,this.y-cameraY+this.size/2);
        ctx.rotate(this.pipe.angle);
        ctx.fillStyle='#fff';
        ctx.fillRect(0,-2,this.pipe.length,4);
        ctx.restore();
    }
}
const player = new Player();

// =====================
// ENEMY
// =====================
class Enemy {
    constructor() { this.reset(); }
    reset() { this.active=false; this.x=0; this.y=0; this.vx=0; this.vy=0; this.type='static'; this.hp=CONFIG.ENEMY_HP; this.shootCooldown=0; }
    spawn(x,y,type){
        this.reset(); this.x=x; this.y=y; this.type=type; this.active=true;
        const f=score/2000;
        if(type==='horizontal') this.vx=(rand(1,2)+2*f)*(Math.random()<0.5?-1:1);
        if(type==='vertical'){ this.vy=rand(1,2)+2*f; this.amplitude=rand(50,120); this.baseY=y; }
    }
    update(){
        if(!this.active) return;
        if(this.type==='horizontal'){ this.x+=this.vx; if(this.x<0||this.x+CONFIG.ENEMY_SIZE>canvas.width) this.vx*=-1; }
        if(this.type==='vertical'){ this.y+=this.vy; if(this.y>this.baseY+this.amplitude||this.y<this.baseY-this.amplitude) this.vy*=-1; }

        if(this.shootCooldown<=0 && isOnScreen(this) && isOnScreen(player)){
            ShootingSystem.requestShot('enemy', this, player);
            this.shootCooldown=CONFIG.ENEMY_SHOOT_INTERVAL;
        } else this.shootCooldown--;

        if(this.y-cameraY>canvas.height||this.hp<=0) this.active=false;
    }
    draw(cameraY){
        if(!this.active) return;
        ctx.fillStyle='#ff0000';
        ctx.fillRect(this.x,this.y-cameraY,CONFIG.ENEMY_SIZE,CONFIG.ENEMY_SIZE);
    }
}
const enemies = Array.from({length:CONFIG.MAX_ENEMIES},()=>new Enemy());

// =====================
// PLATFORM
// =====================
class Platform {
    constructor(){ this.reset(); }
    reset(){ this.active=false; this.x=0; this.y=0; this.vx=0; this.vy=0; this.amplitude=0; this.movementType='static'; this.isBroken=false; }
    spawn(x,y,movementType,isBroken){ this.reset(); this.x=x; this.y=y; this.movementType=movementType; this.isBroken=isBroken; this.active=true; }
    update(){ if(!this.active) return; if(this.movementType==='horizontal'){ this.x+=this.vx; if(this.x<0||this.x+CONFIG.PLATFORM_WIDTH>canvas.width) this.vx*=-1; } 
              if(this.movementType==='vertical'){ this.y+=this.vy; if(this.y>this.baseY+this.amplitude||this.y<this.baseY-this.amplitude) this.vy*=-1; } 
              if(this.y-cameraY>canvas.height) this.active=false; }
    draw(){ if(!this.active) return; ctx.fillStyle='#00ff88'; ctx.fillRect(this.x,this.y-cameraY,CONFIG.PLATFORM_WIDTH,CONFIG.PLATFORM_HEIGHT);}
    checkCollision(player){
        if(!this.active) return false;
        const prevBottom=player.lastY+player.size;
        const currBottom=player.y+player.size;
        if(player.vy>0 && prevBottom<=this.y+CONFIG.PLATFORM_HEIGHT && currBottom>=this.y && player.x+player.size>this.x && player.x<this.x+CONFIG.PLATFORM_WIDTH){
            player.vy=-player.jumpForce;
            return true;
        }
        return false;
    }
}
const platforms = Array.from({length:CONFIG.MAX_PLATFORMS},()=>new Platform());

// =====================
// NFT BOX
// =====================
class NFTBox {
    constructor(){ this.active=false; this.x=0; this.y=0; this.size=30; }
    spawn(x,y){ this.active=true; this.x=x; this.y=y; }
    update(){
        if(!this.active) return;
        if(player.x+player.size>this.x && player.x<this.x+this.size && player.y+player.size>this.y && player.y<this.y+this.size){
            console.log('NFT Collected!'); coins+=1; this.active=false;
        }
    }
    draw(){ if(!this.active) return; ctx.fillStyle='#ff00ff'; ctx.fillRect(this.x,this.y-cameraY,this.size,this.size); }
}
const nftBox = new NFTBox();
let nftSpawned=false;

// =====================
// SPAWN ENTITIES
// =====================
function spawnEntities(){
    const factor=score/2000;

    platforms.forEach(p=>{
        if(!p.active){
            const gap=rand(CONFIG.MIN_GAP, CONFIG.MAX_GAP);
            const x=rand(0,canvas.width-CONFIG.PLATFORM_WIDTH);
            const y=maxPlatformY-gap;
            const types=['static']; if(Math.random()<0.1) types.push('horizontal');
            p.spawn(x,y,pick(types),false);
            maxPlatformY=y;
        }
    });

    // враги
    const SCORE_STEP=500+Math.random()*500;
    if(score%SCORE_STEP<1){
        const e=enemies.find(e=>!e.active);
        if(e){
            const x=rand(0,canvas.width-CONFIG.ENEMY_SIZE);
            const y=cameraY-CONFIG.ENEMY_SIZE;
            e.spawn(x,y,pick(['static','horizontal','vertical']));
        }
    }

    // NFT Box
    if(!nftSpawned && score>=5000 && score<=10000){
        const x=rand(50,canvas.width-50);
        const y=cameraY-300;
        nftBox.spawn(x,y);
        nftSpawned=true;
    }
}

// =====================
// CAMERA
// =====================
function updateCamera(){ const minY=canvas.height*0.65; const target=Math.min(player.y-minY,cameraY); cameraY+=(target-cameraY)*0.18; }

// =====================
// UPDATE / DRAW
// =====================
function update(){
    player.update(inputX);
    platforms.forEach(p=>{ p.update(); p.checkCollision(player); });
    enemies.forEach(e=>e.update());
    spawnEntities();
    nftBox.update();
    ShootingSystem.processShots();
    updateBullets();
    score=player.y<0?-player.y:player.y;
    updateCamera();
}

function draw(){
    ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
    platforms.forEach(p=>p.draw());
    enemies.forEach(e=>e.draw(cameraY));
    nftBox.draw();
    player.draw(cameraY);
    drawBullets();
    ctx.fillStyle='#fff'; ctx.font='20px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`,10,30);
    ctx.fillText(`Coins: ${coins}`,10,60);
}

// =====================
// LOOP
// =====================
function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();