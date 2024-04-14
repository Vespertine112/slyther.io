import type InputManager from "$lib/inputManager";
import type { State } from "./state";
import { GameStateEnum } from "./stateMachine";

export class HighScoresState implements State {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private highScores: { name: string; score: number }[];
    private inputManager: InputManager;
    private enumTracker: GameStateEnum = GameStateEnum.HighScoresState;
    private scrollSpeed = 1;
    private scrollPosition = 0;
    private fontSize = 24;

    constructor(canvas: HTMLCanvasElement, inputManager: InputManager, highScores: { name: string; score: number }[]) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.highScores = highScores;
        this.inputManager = inputManager;
    }

    enter(): void {
        this.enumTracker = GameStateEnum.HighScoresState;
        this.fontSize = Math.min(24, this.canvas.width / 20);

        this.inputManager.registerCommand(
            ["Escape"],
            {},
            () => {},
            () => {
                this.enumTracker = GameStateEnum.MainMenuState;
            },
        );
    }
    processInput(elapsedTime: number): GameStateEnum {
        return this.enumTracker;
    }
    update(elapsedTime: number): void {}
    render(elapsedTime: number): void {
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `${this.fontSize}pt silkscreen`;
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.strokeStyle = "#43E121";
        this.ctx.lineWidth = 5;

        let startY = this.canvas.height * 0.1;
        let finalY = this.canvas.height - startY;
        let x = this.canvas.width / 2;
        let padding = this.canvas.height * 0.025;
        const cornerRadius = 10;
        let metrics = this.ctx.measureText("M");
        let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        let largestTextWidth: number = this.highScores.reduce((maxWidth, current) => {
            let text = `1. ${current.name}: ${current.score}`;
            return this.ctx.measureText(text).width > maxWidth ? this.ctx.measureText(text).width : maxWidth;
        }, 0);

        this.ctx.beginPath();
        // Top Left
        this.ctx.moveTo(x - largestTextWidth / 2 - padding, startY - textHeight - padding);
        // Top Right to Bottom Right
        this.ctx.arcTo(
            x + largestTextWidth / 2 + padding,
            startY - textHeight - padding,
            x + largestTextWidth / 2 + padding,
            finalY + padding,
            cornerRadius,
        );
        // Bottom right to Bottom Left
        this.ctx.arcTo(
            x + largestTextWidth / 2 + padding,
            finalY + padding,
            x - largestTextWidth / 2 - padding,
            finalY + padding,
            cornerRadius,
        );
        // Bottom Left to Top Left
        this.ctx.arcTo(
            x - largestTextWidth / 2 - padding,
            finalY + padding,
            x - largestTextWidth / 2 - padding,
            startY - textHeight - padding,
            cornerRadius,
        );
        // Top Left to Top Right
        this.ctx.arcTo(
            x - largestTextWidth / 2 - padding,
            startY - textHeight - padding,
            x + largestTextWidth / 2 + padding,
            startY - textHeight - padding,
            cornerRadius,
        );

        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fill();

        // Actual Scores
        this.ctx.font = `${this.fontSize}pt silkscreen`;
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "#43E121";
        this.ctx.strokeStyle = "#43E121";
        this.ctx.lineWidth = 5;

        this.highScores.forEach((score, i) => {
            let text = `${i + 1}. ${score.name}: ${score.score}`;
            let y = startY + i * (textHeight + padding);
            this.ctx.fillText(text, this.canvas.width / 2, y);
        });

        this.ctx.restore();
    }

    exit(): void {}
}
