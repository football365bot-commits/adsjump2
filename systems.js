import { CONFIG, rand, pick } from './config.js';
import { cameraY, setCameraY } from './state.js';

export const ScoreManager = {
    value: 0,
    maxY: null,
    update(player) {
        if (this.maxY === null || player.y < this.maxY) {
            if (this.maxY !== null) this.value += this.maxY - player.y;
            this.maxY = player.y;
        }
    },
    reset() {
        this.value = 0;
        this.maxY = null;
    }
};

export function updateCamera(player, canvas) {
    const minY = canvas.height * 0.65;
    const target = Math.min(player.y - minY, cameraY);
    setCameraY(cameraY + (target - cameraY) * 0.18);
}
