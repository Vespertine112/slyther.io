import type { Entity } from '../shared/entites/entity';
import { Random } from '../shared/random';
import { Position, Vector } from '$lib/shared/gameTypes';

export enum GameStatusEnum {
	Playing,
	Won,
	Lost,
	Idle
}

/**
 * Game - All State for the lander game
 */
export class Game {
	playerScore: number = 100;
	playTime: number = 0;
	gameState: GameStatusEnum = GameStatusEnum.Idle;

	private canvas!: HTMLCanvasElement;
	private oldCanvas!: { width: number; height: number }; // Tracks canvas changes to re-size terrain on dynamic changes

	constructor() {}

	initalizeGame(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.oldCanvas = { width: canvas.width, height: canvas.height };
	}

	update(elapsedTime: number) {
		this.canvasChangeHookForTerrain();
	}

	exit() {
		this.gameState = GameStatusEnum.Idle;
	}

	canvasChangeHookForTerrain() {
		if (this.canvasSizeHasChanged()) {
			this.updatePositionsAndSizeForCanvasChange();
			this.updateOldCanvasWithNew();
		}
	}

	private updatePositionsAndSizeForCanvasChange() {
		const scaleY = this.canvas.height / this.oldCanvas.height;
		const scaleX = this.canvas.width / this.oldCanvas.width;
	}

	private updateOldCanvasWithNew() {
		this.oldCanvas.height = this.canvas.height;
		this.oldCanvas.width = this.canvas.width;
	}

	private canvasSizeHasChanged() {
		return this.canvas.height != this.oldCanvas.height || this.canvas.width != this.oldCanvas.width;
	}

	private generateThrustVector(angleInDegrees: number, magnitude: number): Vector {
		const angleInRadians = (angleInDegrees * Math.PI) / 180;
		const thrustX = -magnitude * Math.cos(angleInRadians);
		const thrustY = magnitude * Math.sin(angleInRadians);
		const angledVector = new Vector(thrustY, thrustX);

		return angledVector;
	}
}
