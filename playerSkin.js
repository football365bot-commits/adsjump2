// playerSkin.js
export class PlayerSkin {
    constructor(skinSrc) {
        this.baseImage = new Image();
        this.baseImage.src = skinSrc;

        // мини-канвас для игрового размера
        this.gameCanvas = document.createElement('canvas');
        this.gameCtx = this.gameCanvas.getContext('2d');

        // текущий размер для игры (40x40)
        this.gameCanvas.width = 40;
        this.gameCanvas.height = 40;

        // флаг, когда изображение загрузилось
        this.loaded = false;

        this.baseImage.onload = () => {
            this.loaded = true;
            this.updateGameCanvas();
        };
    }

    // функция обновления мини-канваса для игры
    updateGameCanvas() {
        if (!this.loaded) return;

        // очищаем
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // рисуем скин в размер 40x40
        this.gameCtx.drawImage(this.baseImage, 0, 0, this.gameCanvas.width, this.gameCanvas.height);
    }

    // возвращает канвас для игры
    getGameCanvas() {
        return this.gameCanvas;
    }

    // функция для рисования большого скина (например, в меню)
    drawMenu(ctx, x, y, size = 500) {
        if (!this.loaded) return;
        ctx.drawImage(this.baseImage, x, y, size, size);
    }

    // если нужно, можно обновлять скин динамически
    setSkin(src) {
        this.baseImage.src = src;
        this.baseImage.onload = () => {
            this.loaded = true;
            this.updateGameCanvas();
        };
    }
}