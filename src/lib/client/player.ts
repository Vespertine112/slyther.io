import { Random } from '../shared/random';
import { Entity } from './entites/entity';
import { Position } from '../shared/gameTypes';
import Sprite from './entites/sprite';

export class Player {
	head!: Entity;

	length: number; // Represents player size (length)
	speed: number;
	direction: number; // Direction in radians
	rotateRate: number = Math.PI / 1000;
	position: Position;

	reportUpdate: boolean = false;
	lastUpdate: number = 0;
	updateWindow: number = 0;

	clientId: string;

	constructor(clientId: string, bodyEntitySpec?: { head: Entity; body: Entity; tail: Entity }) {
		this.clientId = clientId;
		this.position = new Position(0, 0);
		this.length = 10;
		this.speed = 0.00001;
		this.direction = Random.getRandomInt(Math.PI * 2); // Random direction in radians

		let size = 30;
		if (!bodyEntitySpec) {
			let headSprite = new Sprite(
				'assets/snakes/snake_green_head.png',
				{ render: true },
				{
					animate: false,
					animStartX: 0,
					animStartY: 0,
					animCropH: 1024,
					animCropW: 1024,
					sheetCols: 1,
					sheetRows: 1
				}
			);
			let bodySprite = new Sprite(
				'assets/snakes/snake_green_blob.png',
				{ render: true },
				{
					animate: false,
					animStartX: 0,
					animStartY: 0,
					animCropH: 512,
					animCropW: 512,
					sheetCols: 1,
					sheetRows: 1
				}
			);
			this.head = new Entity(
				'std',
				{ render: true, position: this.position, width: size, height: size },
				{ std: headSprite }
			);
			let body = new Entity('std', { render: true, position: this.position }, { std: bodySprite });
			this.head.child = body;
		}
	}

	// Moves a player based on elapsed time
	boost(elapsedTime: number) {
		this.reportUpdate = true;

		// Calculate movement components based on direction and speed
		const deltaX = Math.cos(this.direction) * this.speed * 2 * elapsedTime;
		const deltaY = Math.sin(this.direction) * this.speed * 2 * elapsedTime;

		// Update player position
		this.position.x += deltaX;
		this.position.y += deltaY;
	}

	// Rotates a player's head right
	rotateRight(elapsedTime: number) {
		this.reportUpdate = true;

		// Increment direction angle
		this.direction += this.rotateRate * elapsedTime;
		this.head.direction += this.rotateRate * elapsedTime;
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		this.reportUpdate = true;

		// Decrement direction angle
		this.direction -= this.rotateRate * elapsedTime;
		this.head.direction -= this.rotateRate * elapsedTime;
	}

	// Player consumes 'foods' food units
	eat(foods: number) {
		this.reportUpdate = true;
	}

	// Continue movement based on current time
	update(elapsedTime: number) {
		this.reportUpdate = true;

		// Calculate movement components based on direction and speed
		const deltaX = Math.cos(this.direction) * this.speed * elapsedTime;
		const deltaY = Math.sin(this.direction) * this.speed * elapsedTime;

		// Update player position
		this.position.x += deltaX;
		this.position.y += deltaY;
	}
}
