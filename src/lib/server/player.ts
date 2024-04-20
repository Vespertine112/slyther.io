import { Random } from '../shared/random';
import { Position } from '../shared/gameTypes';
import { Queue } from '../shared/queue';

export class Player {
	length: number; // Represents player length
	size: number; // Player size (length / width for body parts)
	speed: number;
	rotateRate: number = Math.PI / 300;
	positions: Position[] = [];
	directions: number[] = []; // Direction(s) in radians for each body part

	reportUpdate: boolean = false;
	lastUpdate: number = 0;
	updateWindow: number = 0;

	clientId: string;

	constructor(clientId: string, pos: Position) {
		this.clientId = clientId;
		this.positions.push(pos);
		this.length = 50;
		this.speed = 0.00005;
		this.size = 1 / 50;
		this.directions.push(Random.getRandomInt(Math.PI * 2)); // Random direction in radians

		this.createBodyParts();
	}

	private createBodyParts() {
		// Calculate offset for body and tail based on direction
		const offset = 0.0025;
		const offsetX = Math.cos(this.directions[0]) * offset;
		const offsetY = Math.sin(this.directions[0]) * offset;

		// Create positions for head, body, and tail
		let x = this.positions[0].x;
		let y = this.positions[0].y;

		for (let i = 1; i < this.length; i++) {
			x -= offsetX;
			y -= offsetY;
			let newPos = new Position(x, y);
			newPos.prev = new Position(this.positions[i - 1].x, this.positions[i - 1].y);
			this.positions.push(newPos);
		}
	}

	boost(elapsedTime: number) {
		this.reportUpdate = true;
		this.moveSnakeForward(elapsedTime);
	}

	// Rotates a player's head right
	rotateRight(elapsedTime: number) {
		this.reportUpdate = true;

		// Increment direction angle
		this.directions[0] += this.rotateRate * elapsedTime;
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		this.reportUpdate = true;

		// Decrement direction angle
		this.directions[0] -= this.rotateRate * elapsedTime;
	}

	// Player consumes 'foods' food units
	eat(foods: number) {
		this.reportUpdate = true;
	}

	// Continue movement based on current time
	update(elapsedTime: number) {
		this.moveSnakeForward(elapsedTime);
	}

	private moveSnakeForward(elapsedTime: number) {
		// Update tail position to chase the body part in front of it
		for (let i = this.positions.length - 1; i > 0; i--) {
			const deltaX = this.positions[i].prev!.x - this.positions[i].x;
			const deltaY = this.positions[i].prev!.y - this.positions[i].y;

			const absDx = Math.abs(deltaX);
			const absDy = Math.abs(deltaY);

			const distance = Math.sqrt(absDx * absDx + absDy * absDy);
			const ratio = (this.speed * elapsedTime) / distance;

			if (distance > 0) {
				this.positions[i].x += deltaX * ratio;
				this.positions[i].y += deltaY * ratio;
				this.directions[i] = Math.atan2(deltaY, deltaX);
			}

			// Check if the body part has reached its target position
			if (distance <= this.speed * elapsedTime) {
				this.positions[i].prev = new Position(this.positions[i - 1].x, this.positions[i - 1].y);
			}
		}

		// Update head position and direction
		const headDeltaX = Math.cos(this.directions[0]) * this.speed * elapsedTime;
		const headDeltaY = Math.sin(this.directions[0]) * this.speed * elapsedTime;
		this.positions[0].x += headDeltaX;
		this.positions[0].y += headDeltaY;
	}
}
