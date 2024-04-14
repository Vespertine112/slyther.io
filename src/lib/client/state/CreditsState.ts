import type InputManager from "$lib/inputManager";
import type { State } from "./state";
import { GameStateEnum } from "./stateMachine";

interface Credit {
    source: string;
    description: string;
}

export class CreditsState implements State {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    private inputManager: InputManager;
    private enumTracker: GameStateEnum = GameStateEnum.CreditsState;
    private fontSize = 24;
    private credits: Credit[] = [
        { source: "Brayden Hill", description: "Lead Programmer" },
        { source: "Brayden Hill", description: "Lead Designer" },
        { source: "Brayden Hill", description: "Lead QA Tester" },
        { source: "Brayden Hill", description: "Lead Project Manager" },
        { source: "Brayden Hill", description: "Lead UI Designer" },
        { source: "Brayden Hill", description: "Lead Animator" },
        { source: "Brayden Hill", description: "Lead Level Designer" },
        { source: "Brayden Hill", description: "Lead Writer" },
        { source: "Zapsplat.com", description: "Ship Thrust Sound" },
        { source: "SoundBible.com", description: "Ship Explosion sound" },
        { source: "Pixabay.com", description: "Success Sound" },
    ];

    constructor(canvas: HTMLCanvasElement, inputManager: InputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.inputManager = inputManager;
    }

    enter(): void {
        this.enumTracker = GameStateEnum.CreditsState;
        this.fontSize = Math.min(16, this.canvas.width / 20);

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

        let largestTextWidth: number = this.credits.reduce((maxWidth, current) => {
            let text = `${current.source} - ${current.description}`;
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

        // Actual Credits
        this.ctx.font = `${this.fontSize}pt silkscreen`;
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "#43E121";
        this.ctx.strokeStyle = "#43E121";
        this.ctx.lineWidth = 5;

        this.credits.forEach((credit, i) => {
            let text = `${credit.description} - ${credit.source}`;
            let y = startY + (i + 1) * (textHeight + padding); // Adjusted to start from startY
            this.ctx.fillText(text, this.canvas.width / 2, y);
        });

        this.ctx.restore();
    }

    exit(): void {}
}
