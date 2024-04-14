import type InputManager from "$lib/inputManager";
import type { CustomCommands } from "$lib/inputManager";
import type { State } from "./state";
import { GameStateEnum } from "./stateMachine";

export class CustomControlsState implements State {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    private fontSize!: number;
    private enumTracker: GameStateEnum = GameStateEnum.CustomControlsState;
    private inputManager: InputManager;
    private startY!: number;
    private finalY!: number;
    private padding!: number;
    private textHeight!: number;

    constructor(canvas: HTMLCanvasElement, inputManager: InputManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.inputManager = inputManager;
        this.startY = this.canvas.height * 0.1;
        this.finalY = this.canvas.height - this.startY;
        this.padding = this.canvas.height * 0.025;
    }

    enter(): void {
        this.recalcSizing();

        this.inputManager.registerCommand(["MouseUp"], {}, () => {
            this.inputManager.getMappedCustomCommands().forEach((custCommand, i) => {
                let text = `${custCommand.label}:  ${custCommand.keyCode}`;
                let y = this.startY + i * (this.textHeight + this.padding);

                if (this.inTextBounds(text, this.canvas.width / 2, y, this.fontSize)) {
                    this.inputManager.listenForCustomCommandMap(custCommand.command);
                }
            });
        });

        this.inputManager.registerCommand(
            ["Escape"],
            { fireOnce: true },
            () => {},
            () => (this.enumTracker = GameStateEnum.MainMenuState),
        );
    }

    processInput(elapsedTime: number): GameStateEnum {
        this.inputManager.update(elapsedTime);
        return this.enumTracker;
    }

    update(elapsedTime: number): void {
        this.recalcSizing();
    }

    render(elapsedTime: number): void {
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.font = `${this.fontSize}pt silkscreen`;
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.strokeStyle = "#43E121";
        this.ctx.lineWidth = 5;

        let x = this.canvas.width / 2;
        let padding = this.canvas.height * 0.025;
        const cornerRadius = 10;

        let widthForMenu: number = this.canvas.width / 2;

        this.ctx.beginPath();
        // Top Left
        this.ctx.moveTo(x - widthForMenu / 2 - padding, this.startY - this.textHeight - padding);
        // Top Right to Bottom Right
        this.ctx.arcTo(
            x + widthForMenu / 2 + padding,
            this.startY - this.textHeight - padding,
            x + widthForMenu / 2 + padding,
            this.finalY + padding,
            cornerRadius,
        );
        // Bottom right to Bottom Left
        this.ctx.arcTo(
            x + widthForMenu / 2 + padding,
            this.finalY + padding,
            x - widthForMenu / 2 - padding,
            this.finalY + padding,
            cornerRadius,
        );
        // Bottom Left to Top Left
        this.ctx.arcTo(
            x - widthForMenu / 2 - padding,
            this.finalY + padding,
            x - widthForMenu / 2 - padding,
            this.startY - this.textHeight - padding,
            cornerRadius,
        );
        // Top Left to Top Right
        this.ctx.arcTo(
            x - widthForMenu / 2 - padding,
            this.startY - this.textHeight - padding,
            x + widthForMenu / 2 + padding,
            this.startY - this.textHeight - padding,
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

        this.inputManager.getMappedCustomCommands().forEach((custCommand, i) => {
            let text = `${custCommand.label}:  ${custCommand.keyCode}`;
            let y = this.startY + i * (this.textHeight + this.padding);
            this.renderText(text, this.canvas.width / 2, y, this.fontSize);
        });

        this.ctx.restore();
    }

    exit(): void {
        this.inputManager.unRegisterCommand(["Escape", "MouseUp"]);
        this.enumTracker = GameStateEnum.CustomControlsState;
    }

    private recalcSizing() {
        this.fontSize = Math.min(24, this.canvas.width / 20);
        let metrics = this.ctx.measureText("M");
        this.textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        this.startY = this.canvas.height * 0.1;
        this.finalY = this.canvas.height - this.startY;
        this.padding = this.canvas.height * 0.05;
    }

    // Performs a bound check on text. x & y are respective center for the text on canvas
    private inTextBounds(text: string, x: number, y: number, fontSize: number) {
        this.ctx.save();
        this.ctx.font = `${fontSize}pt silkscreen`;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = this.inputManager.mousePosition.x - rect.left;
        const mouseY = this.inputManager.mousePosition.y - rect.top;
        const textWidth = this.ctx.measureText(text).width;

        this.ctx.restore();
        return mouseX > x - textWidth / 2 && mouseX < x + textWidth / 2 && mouseY > y - fontSize && mouseY < y;
    }

    private renderText(text: string, x: number, y: number, fontSize: number) {
        const textWidth = this.ctx.measureText(text).width;
        // Hover effect! Does the opaque background on hover!
        if (this.inTextBounds(text, x, y, fontSize)) {
            this.ctx.save();
            let metrics = this.ctx.measureText(text);
            let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            const padding = 15;
            const cornerRadius = 10;
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";

            this.ctx.strokeStyle = "#43E121";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            // Top Left
            this.ctx.moveTo(x - textWidth / 2 - padding, y - textHeight - padding);
            // Top Right to Bottom Right
            this.ctx.arcTo(
                x + textWidth / 2 + padding,
                y - textHeight - padding,
                x + textWidth / 2 + padding,
                y + padding,
                cornerRadius,
            );
            // Bottom right to Bottom Left
            this.ctx.arcTo(
                x + textWidth / 2 + padding,
                y + padding,
                x - textWidth / 2 - padding,
                y + padding,
                cornerRadius,
            );
            // Bottom Left to Top Left
            this.ctx.arcTo(
                x - textWidth / 2 - padding,
                y + padding,
                x - textWidth / 2 - padding,
                y - textHeight - padding,
                cornerRadius,
            );
            // Top Left to Top Right
            this.ctx.arcTo(
                x - textWidth / 2 - padding,
                y - textHeight - padding,
                x + textWidth / 2 + padding,
                y - textHeight - padding,
                cornerRadius,
            );
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
            this.canvas.style.cursor = "pointer";
        }

        this.ctx.fillText(text, x, y);
    }
}
