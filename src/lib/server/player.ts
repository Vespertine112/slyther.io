import { Random } from '../shared/random';
import type { Entity } from '../shared/entites/entity';
import type { Position, Vector } from '../shared/gameTypes';

export class Player {
	private head: Entity;
	private body: Entity;
	private tail: Entity;

	size: number; // Represents player size (length)
	speed: number;
	direction: Vector;
	rotateRate: number = Math.PI / 1000;
	position: Position;

	reportUpdate: boolean = false;

	clientId: string;

	constructor(clientId: string, position: Position) {
		this.clientId = clientId;
		this.position = position;
		this.size = 10;
		this.speed = 10;
		this.direction = Random.nextCircleVector();
	}

	// Moves a given player based on elapsed time
	boost(elapsedTime: number) {
		this.reportUpdate = true;

		let vectorX = Math.cos(this.direction.x);
		let vectorY = Math.sin(this.direction.y);

		this.position.x += vectorX * elapsedTime * this.speed;
		this.position.y += vectorY * elapsedTime * this.speed;
	}

	// Rotates a players head right
	rotateRight(elapsedTime: number) {
		this.reportUpdate = true;
	}

	// Rotates a players head left
	rotateLeft(elapsedTime: number) {
		this.reportUpdate = true;
	}

	// Player consumes 'foods' food units
	eat(foods: number) {
		this.reportUpdate = true;
	}

	// Continue movement based on current time
	update(elapsedTime: number) {
		this.reportUpdate = true;

		let vectorX = Math.cos(this.direction.x);
		let vectorY = Math.sin(this.direction.y);

		this.position.x += vectorX * elapsedTime * this.speed;
		this.position.y += vectorY * elapsedTime * this.speed;
	}
}
