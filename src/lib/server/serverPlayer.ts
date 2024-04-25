import { Position } from '../shared/gameTypes';
import { Player } from '../shared/player';

export class ServerPlayer extends Player {
	invincibilityTimer: number;
	reportedAsDead: boolean = false;

	constructor(clientId: string, pos: Position) {
		super(clientId, pos);
		this.length = 60;
		this.speed = 1 / 12500;
		this.size = 1 / 120;
		this.direction = this.calculateDirectionTowardsMiddle();
		/** Players start invincible for (n)ms **/
		this.invincibilityTimer = 5000;

		this.createBodyParts();
	}

	update(elapsedTime: number) {
		super.update(elapsedTime);

		this.invincibilityTimer -= elapsedTime;
	}

	private calculateDirectionTowardsMiddle(): number {
		// Calculate direction towards the middle of the game
		const middleX = 0.5; // Assuming the middle of the game is at x = 0.5
		const middleY = 0.5; // Assuming the middle of the game is at y = 0.5

		const deltaX = middleX - this.positions[0].x;
		const deltaY = middleY - this.positions[0].y;

		return Math.atan2(deltaY, deltaX); // Return direction in radians
	}

	private createBodyParts() {
		// Calculate offset for body and tail based on direction
		const offsetX = Math.cos(this.direction) * this.bodyOffset;
		const offsetY = Math.sin(this.direction) * this.bodyOffset;

		// Create positions for head, body, and tail
		let x = this.positions[0].x;
		let y = this.positions[0].y;

		for (let i = 1; i < this.length; i++) {
			x -= offsetX;
			y -= offsetY;
			let newPos = new Position(x, y);
			newPos.next = new Position(this.positions[i - 1].x, this.positions[i - 1].y);
			this.positions.push(newPos);
		}
	}
}
