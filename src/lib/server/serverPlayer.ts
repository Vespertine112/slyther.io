import { Random } from '../shared/random';
import { Food, Position } from '../shared/gameTypes';
import { Queue } from '../shared/queue';
import { Player } from '../shared/player';

export class ServerPlayer extends Player {
	invincibilityTimer: number;
	reportedAsDead: boolean = false;

	constructor(clientId: string, pos: Position) {
		super(clientId, pos);
		this.length = 5;
		this.speed = 0.00008;
		this.size = 1 / 100;
		this.directions.push(Random.getRandomInt(Math.PI * 2)); // Random direction in radians
		/** Players start invincible for (n)ms **/
		this.invincibilityTimer = 5000;

		this.createBodyParts();
	}

	update(elapsedTime: number) {
		super.update(elapsedTime);

		this.invincibilityTimer -= elapsedTime;
	}

	private createBodyParts() {
		// Calculate offset for body and tail based on direction
		const offset = 0.01;
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
}
