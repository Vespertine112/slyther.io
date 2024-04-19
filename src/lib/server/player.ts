import { Random } from '../shared/random';
import { Position } from '../shared/gameTypes';
import { Queue } from '../shared/queue';

export class Player {
	length: number; // Represents player size (length)
	speed: number;
	rotateRate: number = Math.PI / 400;
	positions: Position[] = [];
	directions: number[] = []; // Direction(s) in radians for each body part
	turnPointQueue: Queue<Position> = new Queue<Position>();

	reportUpdate: boolean = false;
	lastUpdate: number = 0;
	updateWindow: number = 0;

	clientId: string;

	constructor(clientId: string, pos: Position) {
		this.clientId = clientId;
		this.positions.push(pos);
		this.length = 10;
		this.speed = 0.00005;
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

		for (let i = 1; i < this.length - 1; i++) {
			x -= offsetX;
			y -= offsetY;
			this.positions.push(new Position(x, y));
		}

		// Update position for tail
		x -= offsetX;
		y -= offsetY;
		this.positions.push(new Position(x, y));
	}

	// Moves a player based on elapsed time
	boost(elapsedTime: number) {
		this.reportUpdate = true;

		// Calculate movement components based on direction and speed
		const deltaX = Math.cos(this.directions[0]) * this.speed * 2 * elapsedTime;
		const deltaY = Math.sin(this.directions[0]) * this.speed * 2 * elapsedTime;

		// Update player positions
		this.positions.forEach((pos) => {
			pos.x += deltaX;
			pos.y += deltaY;
		});
	}

	// Rotates a player's head right
	rotateRight(elapsedTime: number) {
		this.reportUpdate = true;

		// Increment direction angle
		this.directions[0] += this.rotateRate * elapsedTime;
		this.addTurnPoint(this.positions[0]);
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		this.reportUpdate = true;

		// Decrement direction angle
		this.directions[0] -= this.rotateRate * elapsedTime;
		this.addTurnPoint(this.positions[0]);
	}

	// Player consumes 'foods' food units
	eat(foods: number) {
		this.reportUpdate = true;
	}

	// Continue movement based on current time
	update(elapsedTime: number) {
		this.reportUpdate = true;

		// Update tail position to chase the body part in front of it
		for (let i = this.positions.length - 1; i > 0; i--) {
			const deltaX = this.positions[i - 1].x - this.positions[i].x;
			const deltaY = this.positions[i - 1].y - this.positions[i].y;

			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			const ratio = (this.speed * elapsedTime) / distance;

			this.positions[i].x += deltaX * ratio;
			this.positions[i].y += deltaY * ratio;
			this.directions[i] = Math.atan2(deltaY, deltaX);
		}

		// Update head position and direction
		const headDeltaX = Math.cos(this.directions[0]) * this.speed * elapsedTime;
		const headDeltaY = Math.sin(this.directions[0]) * this.speed * elapsedTime;
		this.positions[0].x += headDeltaX;
		this.positions[0].y += headDeltaY;
	}

	// Method to add turn points when the player rotates
	private addTurnPoint(point: Position) {
		this.turnPointQueue.enqueue(point);
	}
}
