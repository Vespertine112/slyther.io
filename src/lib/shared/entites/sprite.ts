export default class Sprite {
    image: HTMLImageElement;
    readyToRender: boolean = false; // Flag for if the sprite is loaded
    render: boolean; // Flag for if we conditionally want to show the sprite

    animate: boolean;
    animStartX: number;
    animStartY: number;
    animCropW: number;
    animCropH: number;
    animationSheetRows: number;
    animationSheetCols: number;

    fps: number; // Frames Per Second
    frameTimeMs: number; // How long a frame should last
    frameTimeCounter = 0; // Counts the frame timing

    constructor(
        imageLocation: string,
        propSpec: { render: boolean; height?: number; width?: number },
        animateSpec: {
            animate?: boolean;
            fps?: number;
            moveRatePerMs?: number;
            animStartX?: number;
            animStartY?: number;
            animCropW?: number;
            animCropH?: number;
            sheetRows?: number;
            sheetCols?: number;
        },
    ) {
        this.image = new Image();
        this.render = propSpec.render;

        this.animate = animateSpec.animate ?? false;
        this.fps = animateSpec.fps ?? 15;
        this.frameTimeMs = 1000 / this.fps;
        this.animStartX = animateSpec.animStartX ?? 0;
        this.animStartY = animateSpec.animStartY ?? 0;
        this.animCropW = animateSpec.animCropW ?? 0;
        this.animCropH = animateSpec.animCropH ?? 0;
        this.animationSheetRows = animateSpec.sheetRows ?? 0;
        this.animationSheetCols = animateSpec.sheetCols ?? 0;

        this.image.onload = () => {
            this.readyToRender = true;
        };

        this.image.src = imageLocation;
    }

    private colTrack = 0;
    private rowTrack = 0;
    animationStep(elapsedTime: number) {
        // If the browser pauses a tab, the elpased time is going to be MASSIVE. If it is, then we just forget it for a frame.
        // I should come up with a better solution for this.
        if (elapsedTime < this.frameTimeMs * 10) this.frameTimeCounter += elapsedTime;

        if (this.frameTimeCounter > this.frameTimeMs) {
            this.frameTimeCounter -= this.frameTimeMs;

            this.colTrack += 1;
            if (this.colTrack > this.animationSheetCols - 1) {
                this.colTrack = 0;
                this.rowTrack += 1;
            }
            if (this.rowTrack > this.animationSheetRows - 1) {
                this.rowTrack = 0;
            }
        }

        this.animStartX = this.colTrack * this.animCropW!;
        this.animStartY = this.rowTrack * this.animCropH!;
    }
}
