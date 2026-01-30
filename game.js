// =====================
// CANVAS SETUP
// =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// =====================
// GAME STATE
// =====================
const GameState = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

let gameState = GameState.PLAYING;

// =====================
// PAUSE UI
// =====================
class PauseUI {
    constructor(canvas, ctx, { onPause, onResume, onRestart }) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.onPause = onPause;
        this.onResume = onResume;
        this.onRestart = onRestart;
        this.paused = false;
    }

    toggle() {
        this.paused = !this.paused;
        if (this.paused) this.onPause();
        else this.onResume();
    }

    draw(state) {
        if (state !== GameState.PAUSED && state !== GameState.GAME_OVER) return;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(state === GameState.PAUSED ? 'PAUSED' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Click to Resume', this.canvas.width / 2, this.canvas.height / 2 + 60);
        this.ctx.restore();
    }

    handleClick(x, y, state) {
        if (state === GameState.PAUSED) this.toggle();
        if (state === GameState.GAME_OVER) this.onRestart();
        return true;
    }
}

const pauseUI = new PauseUI(canvas, ctx, {
    onPause() { gameState = GameState.PAUSED; },
    onResume() { gameState = GameState.PLAYING; },
    onRestart() { restartGame(); gameState = GameState.PLAYING; }
});

// =====================
// INPUT
// =====================
let inputX = 0;
canvas.addEventListener('click', e => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); inputX = 0; }, { passive: false });

function handleInput(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    if ((gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) &&
        pauseUI.handleClick(x, 0, gameState)) return;
    if (gameState === GameState.PLAYING) inputX = x < canvas.width / 2 ? -1 : 1;
}

// =====================
// RESIZE
// =====================
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
    BULLET_SPEED: 13
};

// =====================
// UTILS
// =====================
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
function isOnScreen(obj) { return obj.y - cameraY + (obj.size||CONFIG.ENEMY_SIZE) > 0 && obj.y - cameraY < canvas.height; }

// =====================
// GLOBALS
// =====================
let cameraY = 0, maxPlatformY = canvas.height, lastTime = performance.now(), coins = 0;

// =====================
// BULLET POOL
// =====================
const bulletPool = Array.from({ length: CONFIG.BULLET_POOL_SIZE }, () => ({ active:false, x:0, y:0, vx:0, vy:0, speed: CONFIG.BULLET_SPEED, damage: CONFIG.PLAYER_BULLET_DAMAGE, owner:null }));

function getBullet() { for (const b of bulletPool) if(!b.active) return b; return null; }
function updateBullets() {
    for(const b of bulletPool){
        if(!b.active) continue;
        b.x+=b.vx; b.y+=b.vy;
        if(b.x<0||b.x>canvas.width||b.y-cameraY<0||b.y-cameraY>canvas.height){ b.active=false; continue; }
        if(b.owner==='player'){ for(const e of enemies){ if(!e.active) continue; if(b.x>e.x&&b.x<e.x+CONFIG.ENEMY_SIZE&&b.y>e.y&&b.y<e.y+CONFIG.ENEMY_SIZE){ e.hp-=CONFIG.PLAYER_BULLET_DAMAGE; b.active=false; if(e.hp<=0) e.active=false; break; } } }
        if(b.owner==='enemy'){ if(b.x>player.x&&b.x<player.x+CONFIG.PLAYER_SIZE&&b.y>player.y&&b.y<player.y+CONFIG.PLAYER_SIZE){ player.hp-=CONFIG.ENEMY_DAMAGE; b.active=false; } }
    }
}
function drawBullets(){ for(const b of bulletPool){ if(!b.active) continue; ctx.fillStyle=b.owner==='player'?'#ffff00':'#ff8800'; ctx.fillRect(b.x-2,b.y-cameraY-1,2,2); } }

// =====================
// SHOOTING SYSTEM
// =====================
const ShootingSystem = {
    requests:[],
    requestShot(owner,shooter,target){ this.requests.push({owner,shooter,target}); },
    processShots(){
        this.requests.forEach(req=>{
            const bullet=getBullet(); if(!bullet) return;
            const dx=(req.target.x+CONFIG.ENEMY_SIZE/2)-(req.shooter.x+CONFIG.PLAYER_SIZE/2);
            const dy=(req.target.y+CONFIG.ENEMY_SIZE/2)-(req.shooter.y+CONFIG.PLAYER_SIZE/2);
            const dist=Math.hypot(dx,dy)||1;
            bullet.active=true; bullet.owner=req.owner;
            bullet.x=req.shooter.x+CONFIG.PLAYER_SIZE/2; bullet.y=req.shooter.y+CONFIG.PLAYER_SIZE/2;
            bullet.vx=dx/dist*bullet.speed; bullet.vy=dy/dist*bullet.speed;
        });
        this.requests=[];
    }
};

// =====================
// PLAYER
// =====================
class Player{
    constructor(){ this.size=CONFIG.PLAYER_SIZE; this.jumpForce=CONFIG.BASE_JUMP_FORCE; this.shootCooldown=0; this.hp=100; this.handAnchor={x:this.size*0.75,y:this.size*0.5}; this.anim={tilt:0,jump:0,land:0}; this.pipe={angle:0,length:18}; this.skinCanvas=null; this.reset(); }
    reset(){ this.x=canvas.width/2; this.y=canvas.height-50; this.vy=0; this.lastY=this.y; this.hp=100; this.visualScale=1; }
    prepareSkin(baseImage,size=CONFIG.PLAYER_SIZE){ const skinCanvas=document.createElement('canvas'); skinCanvas.width=size; skinCanvas.height=size; const ctx=skinCanvas.getContext('2d'); ctx.imageSmoothingEnabled=false; ctx.drawImage(baseImage,0,0,baseImage.width,baseImage.height,0,0,size,size); return skinCanvas; }
    update(inputX){
        this.lastY=this.y; this.x+=inputX*10; if(this.x<-this.size)this.x=canvas.width; if(this.x>canvas.width)this.x=-this.size; this.vy+=CONFIG.GRAVITY; this.y+=this.vy;
        const targetTilt=inputX*0.25; this.anim.tilt+=(targetTilt-this.anim.tilt)*0.15;
        if(this.vy<0)this.anim.jump=1; this.anim.jump=Math.max(0,this.anim.jump-0.08);
        if(this.vy>0&&this.lastY+this.size<=this.y)this.anim.land=1; this.anim.land=Math.max(0,this.anim.land-0.12);
        if(this.shootCooldown<=0){ let target=null; for(const e of enemies){ if(e.active&&isOnScreen(e)){ target=e; break; } } if(target&&isOnScreen(this)){ ShootingSystem.requestShot('player',this,target); this.shootCooldown=10; const dx=(target.x+CONFIG.ENEMY_SIZE/2)-(this.x+this.size/2); const dy=(target.y+CONFIG.ENEMY_SIZE/2)-(this.y+this.size/2); this.pipe.angle=Math.atan2(dy,dx); } }else{ this.shootCooldown--; }
    }
    draw(cameraY){
        const cx=this.x+this.size/2; const cy=this.y-cameraY+this.size/2;
        const jumpStretch=Math.sin(this.anim.jump*Math.PI)*0.25; const landSquash=Math.sin(this.anim.land*Math.PI)*0.2;
        const scaleY=1-jumpStretch+landSquash; const scaleX=1+jumpStretch-landSquash;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(this.anim.tilt); ctx.scale(scaleX,scaleY);
        if(this.skinCanvas)ctx.drawImage(this.skinCanvas,-this.size/2,-this.size/2,this.size,this.size);
        else { ctx.fillStyle='#00ff00'; ctx.fillRect(-this.size/2,-this.size/2,this.size,this.size); }
        ctx.restore();
        ctx.save(); const handX=this.x+this.handAnchor.x; const handY=this.y+this.handAnchor.y-cameraY;
        ctx.translate(handX,handY); ctx.rotate(this.pipe.angle); ctx.fillStyle='#fff'; ctx.fillRect(0,-2,this.pipe.length,4); ctx.restore();
    }
}
const player=new Player();
const playerSkin=new Image(); playerSkin.src='chiba.jpg'; playerSkin.onload=()=>{ player.skinCanvas=player.prepareSkin(playerSkin,CONFIG.PLAYER_SIZE); };

// =====================
// PLATFORMS, ENEMIES, ITEMS, BLACKHOLE
// =====================
// Для краткости — сюда вставляем твой код платформ, врагов, предметов и черных дыр без изменений
// … (оставляем все классы Platform, Enemy, Item, BlackHole из твоего кода)

// =====================
// NFT BOX
// =====================
class NFTBox {
    constructor() { this.active=false; this.x=0; this.y=0; this.size=30; }
    spawn(platform){
        this.active=true;
        this.platform=platform;
        this.x=platform.x+CONFIG.PLATFORM_WIDTH/2-this.size/2;
        this.y=platform.y-this.size;
    }
    update(){ if(!this.active||!this.platform||!this.platform.active){ this.active=false; return; } this.x=this.platform.x+CONFIG.PLATFORM_WIDTH/2-this.size/2; this.y=this.platform.y-this.size; if(player.x+CONFIG.PLAYER_SIZE>this.x && player.x<this.x+this.size && player.y+CONFIG.PLAYER_SIZE>this.y && player.y<this.y+this.size){ this.active=false; /* здесь логика получения NFT */ } }
    draw(){ if(!this.active) return; ctx.fillStyle='#ff00ff'; ctx.fillRect(this.x,this.y-cameraY,this.size,this.size); }
}
const nftBoxPool=[new NFTBox()];
let nftSpawned=false;

// =====================
// SPAWN ENTITIES
// =====================
function spawnEntities(isReset=false){
    // твоя логика платформ и врагов
    if(!nftSpawned && ScoreManager.value>=5000 && ScoreManager.value<=10000){
        const platform=platforms.find(p=>p.active); if(platform){ nftBoxPool[0].spawn(platform); nftSpawned=true; }
    }
}

// =====================
// GAME LOOP
// =====================
function update(){
    if(gameState!==GameState.PLAYING) return;
    player.update(inputX);
    platforms.forEach(p=>{ p.update(); p.checkCollision(player); });
    enemies.forEach(e=>e.update());
    spawnEntities();
    itemPool.forEach(i=>i.update());
    blackHolePool.forEach(bh=>bh.update());
    ShootingSystem.processShots();
    updateBullets();
    ScoreManager.update(player);
    updateCamera();
    if(player.y-cameraY>canvas.height||player.hp<=0){ coins=calculateCoins(ScoreManager.value); gameState=GameState.GAME_OVER; }
}
function draw(){
    ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
    platforms.forEach(p=>p.draw(cameraY));
    enemies.forEach(e=>e.draw(cameraY));
    itemPool.forEach(i=>i.draw());
    nftBoxPool.forEach(b=>b.draw());
    player.draw(cameraY);
    drawBullets();
    blackHolePool.forEach(bh=>bh.draw(cameraY));
    ctx.fillStyle='#fff'; ctx.font='20px Arial'; const centerX=canvas.width/2;
    ctx.textAlign='right'; ctx.fillText(`${Math.floor(ScoreManager.value)}`,centerX-10,30);
    ctx.textAlign='left'; ctx.fillText(`HP: ${player.hp}`,centerX+10,30);
}
function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(gameState===GameState.PLAYING){ update(); draw(); pauseUI.draw(GameState.PLAYING); }
    else if(gameState===GameState.PAUSED){ draw(); pauseUI.draw(gameState); }
    else if(gameState===GameState.GAME_OVER){ draw(); pauseUI.draw(gameState); }
    requestAnimationFrame(loop);
}
loop();
function restartGame(){ player.reset(); ScoreManager.reset(); cameraY=0; bulletPool.forEach(b=>b.active=false); enemies.forEach(e=>e.reset()); platforms.forEach(p=>p.reset()); itemPool.forEach(i=>i.active=false); nftBoxPool.forEach(b=>b.active=false); nftSpawned=false; spawnEntities(true); }