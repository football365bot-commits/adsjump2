import { PauseUI, GameState } from './pause.js';
import { PlayerAnchors } from './anchors.js';

// =====================
// CANVAS SETUP
// =====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ===== Game State =====
let gameState = GameState.PLAYING; // старт сразу в игру

// ===== Pause UI ===
const pauseUI = new PauseUI(canvas, ctx, {
    onPause() { gameState = GameState.PAUSED; },
    onResume() { gameState = GameState.PLAYING; },
    onRestart() { restartGame(); gameState = GameState.PLAYING; },
});

// Клик мышкой
canvas.addEventListener('click', e => { handleInput(e.clientX, e.clientY); });

// Touch start
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
}, { passive: false });

// Touch end
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    inputX = 0;
}, { passive: false });

// === функция обработки клика / тача ===
function handleInput(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    if ((gameState === GameState.PLAYING || gameState === GameState.PAUSED || gameState === GameState.GAME_OVER) &&
        pauseUI.handleClick(x, y, gameState)) return;

    if (gameState === GameState.PLAYING) inputX = x < canvas.width / 2 ? -1 : 1;
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// ===================== CONFIG =====================
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

// ===================== UTILS =====================
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function isOnScreen(obj) {
    return obj.y - cameraY + (obj.size || CONFIG.ENEMY_SIZE) > 0 && obj.y - cameraY < canvas.height;
}

// ===================== GLOBAL STATE =====================
let cameraY = 0;
let maxPlatformY = canvas.height;
let inputX = 0;
let lastTime = performance.now();
let coins = 0;

// ===================== BULLET POOL =====================
const bulletPool = Array.from({ length: CONFIG.BULLET_POOL_SIZE }, () => ({
    active: false, x:0, y:0, vx:0, vy:0, speed: CONFIG.BULLET_SPEED, damage: CONFIG.PLAYER_BULLET_DAMAGE, owner: null
}));

function getBullet() { return bulletPool.find(b => !b.active) || null; }
function updateBullets() {
    for (const b of bulletPool) {
        if (!b.active) continue;
        b.x += b.vx; b.y += b.vy;

        if (b.x<0||b.x>canvas.width||b.y-cameraY<0||b.y-cameraY>canvas.height){b.active=false;continue;}

        if (b.owner==='player'){
            for (const e of enemies){
                if(!e.active) continue;
                if(b.x>e.x && b.x<e.x+CONFIG.ENEMY_SIZE && b.y>e.y && b.y<e.y+CONFIG.ENEMY_SIZE){
                    e.hp-=CONFIG.PLAYER_BULLET_DAMAGE; b.active=false;
                    if(e.hp<=0) e.active=false;
                    break;
                }
            }
        }
        if(b.owner==='enemy'){
            if(b.x>player.x && b.x<player.x+CONFIG.PLAYER_SIZE && b.y>player.y && b.y<player.y+CONFIG.PLAYER_SIZE){
                player.hp-=CONFIG.ENEMY_DAMAGE;
                b.active=false;
            }
        }
    }
}
function drawBullets() {
    for (const b of bulletPool){
        if(!b.active) continue;
        ctx.fillStyle = b.owner==='player'?'#ffff00':'#ff8800';
        ctx.fillRect(b.x-2,b.y-cameraY-1,2,2);
    }
}

const ShootingSystem = {
    requests: [],
    requestShot(owner, shooter, target){ this.requests.push({owner, shooter, target}); },
    processShots(){
        this.requests.forEach(req=>{
            const bullet=getBullet(); if(!bullet) return;
            const dx=(req.target.x+CONFIG.ENEMY_SIZE/2)-(req.shooter.x+CONFIG.PLAYER_SIZE/2);
            const dy=(req.target.y+CONFIG.ENEMY_SIZE/2)-(req.shooter.y+CONFIG.PLAYER_SIZE/2);
            const dist=Math.hypot(dx,dy)||1;
            bullet.active=true;
            bullet.owner=req.owner;
            bullet.x=req.shooter.x+CONFIG.PLAYER_SIZE/2;
            bullet.y=req.shooter.y+CONFIG.PLAYER_SIZE/2;
            bullet.vx=dx/dist*bullet.speed;
            bullet.vy=dy/dist*bullet.speed;
        });
        this.requests=[];
    }
};

// ===================== PLAYER =====================
class Player {
    constructor() {
        this.size=CONFIG.PLAYER_SIZE;
        this.jumpForce=CONFIG.BASE_JUMP_FORCE;
        this.shootCooldown=0;
        this.hp=100;
        this.handAnchor={x:this.size*0.75,y:this.size*0.5};
        this.anim={ tilt:0,jump:0,land:0 };
        this.pipe={ angle:0,length:18 };
        this.skinCanvas=null;
        this.menuSkinCanvas=null;
        this.reset();
    }
    reset(){ this.x=canvas.width/2; this.y=canvas.height-50; this.vy=0; this.lastY=this.y; this.hp=100; this.visualScale=1; }
    prepareSkin(baseImage,size=CONFIG.PLAYER_SIZE){
        const skinCanvas=document.createElement('canvas'); skinCanvas.width=size; skinCanvas.height=size;
        const ctx=skinCanvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
        ctx.drawImage(baseImage,0,0,baseImage.width,baseImage.height,0,0,size,size);
        return skinCanvas;
    }
    update(inputX){
        this.lastY=this.y; this.x+=inputX*10; if(this.x<-this.size) this.x=canvas.width; if(this.x>canvas.width) this.x=-this.size;
        this.vy+=CONFIG.GRAVITY; this.y+=this.vy;
        const targetTilt=inputX*0.25;
        this.anim.tilt+=(targetTilt-this.anim.tilt)*0.15;
        if(this.vy<0) this.anim.jump=1; this.anim.jump=Math.max(0,this.anim.jump-0.08);
        if(this.vy>0 && this.lastY+this.size<=this.y) this.anim.land=1; this.anim.land=Math.max(0,this.anim.land-0.12);
        if(this.shootCooldown<=0){
            let target=null;
            for(const e of enemies){if(e.active&&isOnScreen(e)){target=e;break;}}
            if(target&&isOnScreen(this)){ ShootingSystem.requestShot('player',this,target); this.shootCooldown=10;
                const dx=(target.x+CONFIG.ENEMY_SIZE/2)-(this.x+this.size/2);
                const dy=(target.y+CONFIG.ENEMY_SIZE/2)-(this.y+this.size/2);
                this.pipe.angle=Math.atan2(dy,dx);
            }
        } else this.shootCooldown--;
    }
    draw(cameraY){
        const cx=this.x+this.size/2, cy=this.y-cameraY+this.size/2;
        const jumpStretch=Math.sin(this.anim.jump*Math.PI)*0.25;
        const landSquash=Math.sin(this.anim.land*Math.PI)*0.2;
        const scaleY=1-jumpStretch+landSquash;
        const scaleX=1+jumpStretch-landSquash;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(this.anim.tilt); ctx.scale(scaleX,scaleY);
        if(this.skinCanvas) ctx.drawImage(this.skinCanvas,-this.size/2,-this.size/2,this.size,this.size);
        else{ ctx.fillStyle='#00ff00'; ctx.fillRect(-this.size/2,-this.size/2,this.size,this.size);}
        ctx.restore();
        ctx.save();
        const handX=this.x+this.handAnchor.x; const handY=this.y+this.handAnchor.y-cameraY;
        ctx.translate(handX,handY); ctx.rotate(this.pipe.angle);
        ctx.fillStyle='#fff'; ctx.fillRect(0,-2,this.pipe.length,4); ctx.restore();
    }
}

const player=new Player();
const playerSkin=new Image(); playerSkin.src='chiba.jpg';
playerSkin.onload=()=>{ player.skinCanvas=player.prepareSkin(playerSkin,CONFIG.PLAYER_SIZE); const menuSize=Math.min(canvas.width,canvas.height)*0.85; player.menuSkinCanvas=player.prepareSkin(playerSkin,menuSize); };

// ===================== ENTITIES =====================
const platforms=Array.from({length:CONFIG.MAX_PLATFORMS},()=>new Platform());
const enemies=Array.from({length:CONFIG.MAX_ENEMIES},()=>new Enemy());
const itemPool=Array.from({length:CONFIG.MAX_ITEMS},()=>new Item());
function getItemFromPool(){return itemPool.find(i=>!i.active)||null;}

// ===================== NFT BOX =====================
class NFTBox {
    constructor(){ this.active=false; this.x=0; this.y=0; this.size=30; }
    spawn(x,y){ this.active=true; this.x=x; this.y=y; }
    update(player){
        if(!this.active) return;
        if(player.x+player.size>this.x && player.x<this.x+this.size && player.y+player.size>this.y && player.y<this.y+this.size){
            this.active=false;
            nftState.collected=true;
        }
    }
    draw(cameraY){
        if(!this.active) return;
        ctx.fillStyle='#ffaa00'; ctx.fillRect(this.x,this.y-cameraY,this.size,this.size);
        ctx.fillStyle='#000'; ctx.font='10px Arial'; ctx.textAlign='center';
        ctx.fillText('NFT',this.x+this.size/2,this.y-cameraY+this.size/2+3);
    }
}
const nftState={ spawned:false, collected:false, minted:false };
const nftBox=new NFTBox();
const SKINS=Array.from({length:1000},(_,i)=>({id:i,name:`Skin #${i}`}));
function getRandomSkin(){ return SKINS[Math.floor(Math.random()*SKINS.length)]; }

// ===================== GAME LOOP =====================
spawnEntities(true);
function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(gameState===GameState.PLAYING){ update(); draw(); pauseUI.draw(GameState.PLAYING); }
    else if(gameState===GameState.PAUSED){ draw(); pauseUI.draw(gameState); }
    else if(gameState===GameState.GAME_OVER){ draw(); pauseUI.draw(gameState,coins); if(nftState.collected&&!nftState.minted) drawNFTButton(); }

    requestAnimationFrame(loop);
}

// ===================== DRAW NFT BUTTON =====================
function drawNFTButton(){
    const btnWidth=150, btnHeight=50, x=canvas.width/2-btnWidth/2, y=canvas.height/2-btnHeight/2;
    ctx.fillStyle='#ffaa00'; ctx.fillRect(x,y,btnWidth,btnHeight);
    ctx.fillStyle='#000'; ctx.font='18px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Вывести NFT',x+btnWidth/2,y+btnHeight/2);

    canvas.addEventListener('click',function clickNFT(e){
        const rect=canvas.getBoundingClientRect();
        const clickX=(e.clientX-rect.left)*(canvas.width/rect.width);
        const clickY=(e.clientY-rect.top)*(canvas.height/rect.height);
        if(clickX>=x&&clickX<=x+btnWidth && clickY>=y&&clickY<=y+btnHeight && nftState.collected&&!nftState.minted){
            const skin=getRandomSkin();
            console.log('Минт скина:',skin);
            nftState.minted=true;
            canvas.removeEventListener('click',clickNFT);
        }
    });
}

// ===================== UPDATE & DRAW =====================
function update(){
    if(gameState!==GameState.PLAYING) return;
    player.update(inputX);
    platforms.forEach(p=>{p.update();p.checkCollision(player);});
    enemies.forEach(e=>e.update());
    spawnEntities();
    updateItems();
    blackHolePool.forEach(bh=>bh.update());
    ShootingSystem.processShots();
    updateBullets();
    ScoreManager.update(player);
    updateCamera();

    nftBox.update(player);

    if(player.y-cameraY>canvas.height||player.hp<=0){
        if(gameState!==GameState.GAME_OVER){
            coins=calculateCoins(ScoreManager.value);
            gameState=GameState.GAME_OVER;
        }
    }
}

function draw(){
    ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
    platforms.forEach(p=>p.draw(cameraY));
    enemies.forEach(e=>e.draw(cameraY));
    drawItems();
    player.draw(cameraY);
    drawBullets();
    nftBox.draw(cameraY);

    ctx.fillStyle='#fff'; ctx.font='20px Arial';
    const centerX=canvas.width/2;
    ctx.textAlign='right'; ctx.fillText(`${Math.floor(ScoreManager.value)}`,centerX-10,30);
    ctx.textAlign='left'; ctx.fillText(`HP: ${player.hp}`,centerX+10,30);

    blackHolePool.forEach(bh=>bh.draw(cameraY));
}

loop();