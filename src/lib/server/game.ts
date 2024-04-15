import type { Entity } from '../shared/entites/entity';
import { Random } from '../shared/random';

/**
 * ==============================================================================
 * Classes for Game Logic
 * ==============================================================================
 */

/**
 * Game Position
 */
export class Position {
	x: number;
	y: number;
	parent: Position | undefined;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	/**
	 * @param c Position object
	 * @returns boolean - if two positions are the same coordinates
	 */
	compare(c: Position | undefined): boolean {
		if (!c) return false;
		return c.x == this.x && c.y == this.y;
	}

	/**
	 * Generates a new position object given a vector applied to a point
	 */
	fromVector(vec: Vector) {
		return new Position(this.x + vec.x, this.y + vec.y);
	}
}

/**
 * Vector Class
 */
export class Vector {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	/**
	 * @returns number - computed magnitude of the vector
	 */
	getMagnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/**
	 * Add another vector to this Vector
	 */
	add(other: Vector): Vector {
		this.x += other.x;
		this.y += other.y;

		return this;
	}

	mult(time: number): Vector {
		this.x *= time;
		this.y *= time;
		return this;
	}
}

/**
 * Game level
 * NOTE: The landStripWidth is a percentage of total terrain. 40 = 40% of total
 * terrain is a landing strip.
 * TODO: Add a entity for UI Menuing, etc, background identifier, etc
 */
export interface Level {
	level: string;
	landStripWidth: number;
	numOfLandStrips: number;
	surfaceColor: string;
	varience: number;
	gravity: Vector;
	fuel: number;
	thrustMagnitude: number;
	background: string;
}

// Levels are based on actual surface gravity of the solar bodies. Maybe re-think if this doesn't work in game
export let levels: Level[] = [
	{
		level: 'Pluto',
		numOfLandStrips: 2,
		surfaceColor: '#B6967A',
		landStripWidth: 10,
		varience: 0.1,
		fuel: 500,
		gravity: new Vector(0, -0.62),
		thrustMagnitude: 0.4,
		background: '/backgrounds/level_one_background.png'
	},
	{
		level: 'Ganymede',
		numOfLandStrips: 1,
		landStripWidth: 10,
		surfaceColor: '#4B6784',
		varience: 0.1,
		fuel: 400,
		gravity: new Vector(0, -0.146),
		thrustMagnitude: 0.2,
		background: '/backgrounds/level_two_background.png'
	},
	{
		level: 'Moon',
		numOfLandStrips: 3,
		landStripWidth: 7,
		surfaceColor: '#878AA1',
		varience: 0.15,
		fuel: 300,
		gravity: new Vector(0, -1.625),
		thrustMagnitude: 1,
		background: '/backgrounds/level_three_background.png'
	},
	{
		level: 'Mars',
		numOfLandStrips: 1,
		landStripWidth: 10,
		surfaceColor: '#FF8933',
		varience: 0.15,
		fuel: 350,
		gravity: new Vector(0, -3.71),
		thrustMagnitude: 2.2,
		background: '/backgrounds/level_four_background.png'
	}
];

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
	terrainElevationMap: Array<Position> = new Array<Position>();
	level!: Level;

	fuelLevel: number = 0;
	landerSpeed: number = 0;

	landerEntity!: Entity;
	oldLanderEntity!: { position: Position; direction: number };
	hasCollided: boolean = false; // Collision flag

	private gravity!: Vector;
	private canvas!: HTMLCanvasElement;
	private oldCanvas!: { width: number; height: number }; // Tracks canvas changes to re-size terrain on dynamic changes
	private aggregatePlayerScore: number = 0;
	landingStrips: number[][] = [];

	constructor() {}

	initalizeGame(level: Level, canvas: HTMLCanvasElement) {
		this.playerScore = 0;
		this.playTime = 0;
		this.level = level;
		this.gravity = new Vector(0, -level.gravity.y);
		this.gameState = GameStatusEnum.Playing;

		this.canvas = canvas;
		this.oldCanvas = { width: canvas.width, height: canvas.height };

		let halfHeight = this.canvas.height / 2;
		this.terrainElevationMap = new Array<Position>(
			new Position(0, Random.getRandomInt(halfHeight / 2) + halfHeight),
			new Position(this.canvas.width, Random.getRandomInt(halfHeight / 2) + halfHeight)
		);

		this.fuelLevel = level.fuel;

		this.generateTerrainAndLandingStrips();
	}

	update(elapsedTime: number) {
		this.oldLanderEntity = { position: this.landerEntity.position, direction: this.landerEntity.direction };
		this.hasCollided = this.checkCollisionStatus();
		this.canvasChangeHookForTerrain();

		if (this.hasCollided) {
			let landingStatus = this.checkLandingStatus();
			this.gameState = landingStatus ? GameStatusEnum.Won : GameStatusEnum.Lost;
		} else {
			this.updatePlayerScore();
			this.updateLanderPositionAndMomentum(elapsedTime);
			this.playTime += elapsedTime;
		}
	}

	exit() {
		this.gameState = GameStatusEnum.Idle;
	}

	canvasChangeHookForTerrain() {
		if (this.canvasSizeHasChanged()) {
			this.upateTerrainAndLandingStripForCanvasChange();
			this.updateOldCanvasWithNew();
		}
	}

	private checkLandingStatus(): boolean {
		let safeLanding = true;
		// Check angle & speed
		safeLanding = this.landerSpeed < 2 && (this.landerEntity.direction > 355 || this.landerEntity.direction < 5);

		// Check lander is on landing strip
		let minX = this.landerEntity.position.x;
		let maxX = this.landerEntity.position.x + this.landerEntity.width!;
		safeLanding =
			safeLanding &&
			this.landingStrips.some((strip) => {
				return minX >= strip[0] && maxX <= strip[1];
			});

		return safeLanding;
	}

	private upateTerrainAndLandingStripForCanvasChange() {
		const scaleY = this.canvas.height / this.oldCanvas.height;
		const scaleX = this.canvas.width / this.oldCanvas.width;

		// Update each position in the terrain elevation map based on the new canvas dimensions
		for (let i = 0; i < this.terrainElevationMap.length; i++) {
			this.terrainElevationMap[i].x *= scaleX;
			this.terrainElevationMap[i].y *= scaleY;
		}

		this.landingStrips.forEach((strip) => {
			strip.forEach((pt) => {
				pt *= scaleX;
			});
		});
	}

	private updateOldCanvasWithNew() {
		this.oldCanvas.height = this.canvas.height;
		this.oldCanvas.width = this.canvas.width;
	}

	private canvasSizeHasChanged() {
		return this.canvas.height != this.oldCanvas.height || this.canvas.width != this.oldCanvas.width;
	}

	private checkCollisionStatus(): boolean {
		const lander = this.landerEntity;
		const landerLeft = lander.position.x;
		const landerRight = lander.position.x + lander.width!;
		const landerTop = lander.position.y;
		const landerBottom = lander.position.y + lander.height!;

		for (let idx = 0; idx < this.terrainElevationMap.length - 1; idx++) {
			const pos1 = this.terrainElevationMap[idx];
			const pos2 = this.terrainElevationMap[idx + 1];

			// Terrain segment bound box
			const minX = Math.min(pos1.x, pos2.x);
			const maxX = Math.max(pos1.x, pos2.x);
			const minY = Math.min(pos1.y, pos2.y);
			const maxY = Math.max(pos1.y, pos2.y);

			if (landerRight >= minX && landerLeft <= maxX && landerBottom >= minY && landerTop <= maxY) {
				return true;
			}
		}

		return false;
	}

	private updateLanderPositionAndMomentum(elapsedTime: number) {
		let gravityAcceleration = new Vector(
			(this.gravity.x * elapsedTime) / 200,
			(this.gravity.y * elapsedTime) / 200
		);

		this.landerEntity.momentum.add(gravityAcceleration);

		this.landerEntity.position.x += (this.landerEntity.momentum.x * elapsedTime) / 200;
		this.landerEntity.position.y += (this.landerEntity.momentum.y * elapsedTime) / 200;

		this.landerSpeed = this.landerEntity.momentum.getMagnitude() / 2;
	}

	private updatePlayerScore() {
		this.playerScore = this.aggregatePlayerScore + 100 - Math.trunc(this.playTime / 1000);
	}

	private generateTerrainAndLandingStrips() {
		let terrainPtDepth = 7; // INFO: Hardcode - determines recursive depth while generating terrain varience
		let surfaceRoughFactor = this.level.varience;

		let getNewGeneratedMidPosition = (a: Position, b: Position): Position => {
			let x = a.x + (b.x - a.x) * 0.5;
			let gaussianRandom = Random.nextGaussian();
			let y = (a.y + b.y) * 0.5 + surfaceRoughFactor * Math.abs(b.x - a.x) * gaussianRandom;

			return new Position(x, y);
		};

		let generateTerrainRec = (depth: number, left: Position, right: Position) => {
			if (depth == 0) return;
			let midPt = getNewGeneratedMidPosition(left, right);
			this.terrainElevationMap.push(midPt);

			generateTerrainRec(depth - 1, left, midPt);
			generateTerrainRec(depth - 1, midPt, right);
		};

		generateTerrainRec(terrainPtDepth, this.terrainElevationMap[0], this.terrainElevationMap[1]);

		this.terrainElevationMap.sort((a: Position, b: Position) => {
			return a.x - b.x;
		});

		let landStripWidth = Math.trunc((this.terrainElevationMap.length * this.level.landStripWidth) / 100);
		let availableWidth = this.terrainElevationMap.length; // Available width for landing strips
		let landingStrips: number[][] = Random.generateRandomRanges(
			availableWidth,
			landStripWidth,
			this.level.numOfLandStrips
		);
		landingStrips.forEach((strip) => {
			let landingStripElevation = this.terrainElevationMap[strip[0]].y;
			for (let idx = strip[0]; idx < strip[1]; idx++) {
				this.terrainElevationMap[idx].y = landingStripElevation;
			}

			let scaleFactor = this.canvas.width / this.terrainElevationMap.length;
			this.landingStrips.push([strip[0] * scaleFactor, (strip[0] + landStripWidth) * scaleFactor]);
		});
	}

	applyThrust() {
		if (this.fuelLevel > 0) {
			this.landerEntity.momentum.add(
				this.generateThrustVector(this.landerEntity.direction, this.level.thrustMagnitude)
			);
			this.fuelLevel -= 1;
		}
	}

	rotateShip(rotDx: number) {
		if (this.gameState != GameStatusEnum.Playing) return;
		if (this.landerEntity.direction + rotDx < 0) {
			this.landerEntity.direction = 360 + (this.landerEntity.direction + rotDx);
		} else {
			this.landerEntity.direction = (this.landerEntity.direction + rotDx) % 360;
		}
	}

	private generateThrustVector(angleInDegrees: number, magnitude: number): Vector {
		const angleInRadians = (angleInDegrees * Math.PI) / 180;
		const thrustX = -magnitude * Math.cos(angleInRadians);
		const thrustY = magnitude * Math.sin(angleInRadians);
		const thrustVector = new Vector(thrustY, thrustX);

		return thrustVector;
	}
}
