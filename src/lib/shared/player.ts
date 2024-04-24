import { Random } from '../shared/random';
import { Food, Position } from '../shared/gameTypes';
import { Queue } from '../shared/queue';

export enum PlayerStates {
	ALIVE,
	DEAD
}

export class Player {
	clientId: string;
	name: string = '';

	length!: number; // Represents player length
	size!: number; // Player size (length / width for body parts)
	speed!: number;
	rotateRate: number = Math.PI / 300;
	positions: Position[] = [];
	directions: number[] = []; // Direction(s) in radians for each body part

	reportUpdate: boolean = false;
	eatenFoods: string[] = [];
	lastUpdate: number = 0;

	/**
	 * Players current state
	 * If dead, controls are disabled
	 */
	state: PlayerStates = PlayerStates.ALIVE;

	protected readonly bodyOffset: number = 0.007; // Offset for body parts

	constructor(clientId: string, pos: Position) {
		this.clientId = clientId;
		this.name = clientId;
		this.positions.push(pos);
	}

	boost(elapsedTime: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;
		this.moveSnakeForward(elapsedTime, 2);
	}

	// Rotates a player's head right
	rotateRight(elapsedTime: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;

		// Increment direction angle
		this.directions[0] += this.rotateRate * elapsedTime;
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;

		// Decrement direction angle
		this.directions[0] -= this.rotateRate * elapsedTime;
	}

	// Player consumes 'foods' food units
	eat(foodMap: { [foodId: string]: Food }) {
		if (this.state != PlayerStates.ALIVE) return;

		let foodsEaten: string[] = [];
		for (let foodId in foodMap) {
			let food = foodMap[foodId];

			if (this.headCollisionCheck(food.position)) {
				foodsEaten.push(foodId);

				this.reportUpdate = true;
				this.length += Math.floor(food.size);
				if (this.size < 1 / 30) this.size += 1 / 50000;

				// Calculate offset for new body part
				const offsetX = Math.cos(this.directions[this.positions.length - 1]) * this.bodyOffset;
				const offsetY = Math.sin(this.directions[this.positions.length - 1]) * this.bodyOffset;

				// Add new body part at correct offset
				const lastPos = this.positions[this.positions.length - 1];
				const newPos = new Position(lastPos.x - offsetX, lastPos.y - offsetY);
				newPos.prev = new Position(lastPos.x, lastPos.y);

				const newDir = Math.atan2(newPos.y - lastPos.y, newPos.x - lastPos.x);

				this.positions.push(newPos);
				this.directions.push(newDir);
			}
		}

		// Delete eaten foods from the food map
		foodsEaten.forEach((food) => {
			delete foodMap[food];
		});

		this.eatenFoods = foodsEaten;
	}

	// Continue movement based on current time
	update(elapsedTime: number) {
		this.moveSnakeForward(elapsedTime);
	}

	private moveSnakeForward(elapsedTime: number, multiplier?: number) {
		if (this.state != PlayerStates.ALIVE) return;

		// Update tail position to chase the body part in front of it
		for (let i = this.positions.length - 1; i > 0; i--) {
			if (isNaN(this.positions[i].x)) alert('jkl');
			let deltaX = this.positions[i].prev!.x - this.positions[i].x;
			let deltaY = this.positions[i].prev!.y - this.positions[i].y;
			let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			let ratio = (this.speed * (multiplier ?? 1) * elapsedTime) / distance;

			// HACK: This is a bad solution to the floating point issue w/ js on browser :(
			if (ratio == Infinity) {
				this.positions[i].prev = new Position(this.positions[i - 1].x, this.positions[i - 1].y);

				deltaX = this.positions[i].prev!.x - this.positions[i].x;
				deltaY = this.positions[i].prev!.y - this.positions[i].y;
				distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				ratio = (this.speed * (multiplier ?? 1) * elapsedTime) / distance;
			}

			this.positions[i].x += deltaX * ratio;
			this.positions[i].y += deltaY * ratio;
			if (i == this.positions.length - 1) {
				this.directions[i] = Math.atan2(deltaY, deltaX);
			}

			// Check if the body part has reached its target position
			if (distance <= this.speed * elapsedTime * (multiplier ?? 1) || ratio == 0) {
				this.positions[i].prev = new Position(this.positions[i - 1].x, this.positions[i - 1].y);
			}
		}

		// Update head position and direction
		const headDeltaX = Math.cos(this.directions[0]) * this.speed * (multiplier ?? 1) * elapsedTime;
		const headDeltaY = Math.sin(this.directions[0]) * this.speed * (multiplier ?? 1) * elapsedTime;
		this.positions[0].x += headDeltaX;
		this.positions[0].y += headDeltaY;
	}

	headCollisionCheck(pos: Position): boolean {
		// Calculate distance between player's head and the provided point
		const deltaX = this.positions[0].x - pos.x;
		const deltaY = this.positions[0].y - pos.y;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Check if the distance is less than or equal to the radius of the player's head
		return distance <= this.size;
	}
}
