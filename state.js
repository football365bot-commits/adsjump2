import { GameState } from './pause.js';

export let cameraY = 0;
export let maxPlatformY = 0;
export let inputX = 0;
export let gameState = GameState.PLAYING;

export function setCameraY(v) { cameraY = v; }
export function setInputX(v) { inputX = v; }
export function setGameState(v) { gameState = v; }
export function setMaxPlatformY(v) { maxPlatformY = v; }
