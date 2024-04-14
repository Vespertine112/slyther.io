import type { State } from "./state";
import { GameStateEnum } from "./stateMachine";

export class PauseMenuState implements State {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
    }
    enter(): void {
        throw new Error("Method not implemented.");
    }
    processInput(elapsedTime: number): GameStateEnum {
        throw new Error("Method not implemented.");
    }
    update(elapsedTime: number): void {
        throw new Error("Method not implemented.");
    }
    render(elapsedTime: number): void {}
    exit(): void {
        throw new Error("Method not implemented.");
    }
}
