import { Food, Position } from '../shared/gameTypes';

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
	direction: number = 0; // Direction(s) in radians for head
	tps: { [idx: number]: Position } = {};
	tpsAdded: { [idx: number]: Position } = {};
	tpsIdx = 0;

	reportUpdate: boolean = false;
	eatenFoods: string[] = [];
	lastUpdate: number = 0;

	/**
	 * Players current state
	 * If dead, controls are disabled
	 */
	state: PlayerStates = PlayerStates.ALIVE;

	protected readonly bodyOffset: number = 0.004; // Offset for body parts
	private targetSnapAngle: number | null = null;

	constructor(clientId: string, pos: Position) {
		this.clientId = clientId;
		this.name = clientId;
		this.positions.push(pos);
	}

	boost(elapsedTime: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;
		this.updateSnapTurnAngle(elapsedTime);
		this.moveSnakeForward(elapsedTime, 2);
	}

	// Rotates a player's head right
	rotateRight(elapsedTime: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;

		// Increment direction angle
		this.direction += this.rotateRate * elapsedTime;

		this.pushToTps();
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;

		// Decrement direction angle
		this.direction -= this.rotateRate * elapsedTime;
		this.pushToTps();
	}

	snapTurn(angle: number) {
		if (this.state != PlayerStates.ALIVE) return;

		this.reportUpdate = true;

		this.targetSnapAngle = angle;
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
				if (this.size < 1 / 40) this.size += 1 / 100000;

				// Calculate angle between the last position and the second-to-last position
				const lastPos = this.positions[this.positions.length - 1];
				const prevPos = this.positions[this.positions.length - 2];
				const deltaX = prevPos.x - lastPos.x;
				const deltaY = prevPos.y - lastPos.y;
				const angle = Math.atan2(deltaY, deltaX);

				// Calculate offset for new body part
				const offsetX = Math.cos(angle) * this.bodyOffset;
				const offsetY = Math.sin(angle) * this.bodyOffset;

				// Add new body part at correct offset
				const newPos = new Position(lastPos.x - offsetX, lastPos.y - offsetY);
				newPos.trackingId = this.positions.at(-1)?.trackingId!;

				this.positions.push(newPos);
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
		this.updateSnapTurnAngle(elapsedTime);
		this.moveSnakeForward(elapsedTime);
	}

	/**
	 * Slither the snake body forward!
	 */
	private moveSnakeForward(elapsedTime: number, multiplier?: number) {
		if (this.state !== PlayerStates.ALIVE) return;

		for (let i = this.positions.length - 1; i > 0; i--) {
			const pos = this.positions[i];

			let deltaX, deltaY, distance, ratio;

			if (this.tps[pos.trackingId]) {
				const tpsPos = this.tps[pos.trackingId];
				deltaX = tpsPos.x - pos.x;
				deltaY = tpsPos.y - pos.y;
				distance = Math.hypot(deltaX, deltaY);
				ratio = (this.speed * (multiplier ?? 1) * elapsedTime) / distance;
			} else {
				const head = this.positions[0];
				deltaX = head.x - pos.x;
				deltaY = head.y - pos.y;
				distance = Math.hypot(deltaX, deltaY);
				ratio = (this.speed * (multiplier ?? 1) * elapsedTime) / distance;

				if (ratio === Infinity) {
					deltaX = head.x - pos.x;
					deltaY = head.y - pos.y;
					distance = Math.hypot(deltaX, deltaY);
					ratio = (this.speed * (multiplier ?? 1) * elapsedTime) / distance;
				}
			}

			this.positions[i].x += deltaX * ratio;
			this.positions[i].y += deltaY * ratio;

			// Add loop to handle passing multiple turn points in a single frame
			while (distance <= this.speed * elapsedTime * (multiplier ?? 1)) {
				// Remove old points from tps after the tail reaches them
				if (i == this.positions.length - 1 && this.tps[pos.trackingId]) {
					delete this.tps[pos.trackingId];
				}

				pos.trackingId++;

				if (!this.tps[pos.trackingId]) break;

				distance = Math.hypot(this.tps[pos.trackingId].x - pos.x, this.tps[pos.trackingId].y - pos.y);
			}
		}

		const headDeltaX = Math.cos(this.direction) * this.speed * (multiplier ?? 1) * elapsedTime;
		const headDeltaY = Math.sin(this.direction) * this.speed * (multiplier ?? 1) * elapsedTime;
		this.positions[0].x += headDeltaX;
		this.positions[0].y += headDeltaY;
	}

	/**
	 * Check for a point collision w/ snake head
	 */
	headCollisionCheck(pos: Position): boolean {
		// Calculate distance between player's head and the provided point
		const deltaX = this.positions[0].x - pos.x;
		const deltaY = this.positions[0].y - pos.y;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Check if the distance is less than or equal to the radius of the player's head
		return distance <= this.size;
	}

	// Calculate the shortest angular distance between two angles
	private shortestAngularDistance(a: number, b: number): number {
		const pi2 = Math.PI * 2;
		let diff = ((b - a + Math.PI) % pi2) - Math.PI;
		if (diff < -Math.PI) diff += pi2;
		return diff;
	}

	/**
	 * If a snap turn is still processing, update direction towards it
	 */
	private updateSnapTurnAngle(elapsedTime: number) {
		if (this.targetSnapAngle !== null && this.direction !== this.targetSnapAngle) {
			let angleDiff = this.shortestAngularDistance(this.direction, this.targetSnapAngle);
			let rotationDirection = Math.sign(angleDiff);

			let newDirection = this.direction + rotationDirection * this.rotateRate * elapsedTime;

			if (Math.abs(angleDiff) < Math.abs(rotationDirection * this.rotateRate * elapsedTime)) {
				this.direction = this.targetSnapAngle;
				this.targetSnapAngle = null;
			} else {
				this.direction = newDirection;
			}

			this.pushToTps();
			this.reportUpdate = true;
		}
	}

	/**
	 * Add heads position to top of tps
	 */
	private pushToTps() {
		this.tpsAdded[this.tpsIdx] = structuredClone(this.positions[0]);
		this.tps[this.tpsIdx] = structuredClone(this.positions[0]);
		this.tpsIdx++;
	}
}
