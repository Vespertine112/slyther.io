import { Random } from '../shared/random';
import { Position } from '../shared/gameTypes';
import { Entity } from './entites/entity';
import Sprite from './entites/sprite';

export class Player {
	length: number;
	size: number;
	speed: number;
	rotateRate: number = Math.PI / 400;
	positions: Position[] = [];
	directions: number[] = []; // Direction(s) in radians for body part

	head!: Entity;
	body!: Entity;
	tail!: Entity;

	reportUpdate: boolean = false;
	reportEat: boolean = false;
	lastUpdate: number = 0;
	updateWindow: number = 0;

	clientId: string;

	constructor(
		clientId: string,
		pos: Position[],
		dir: number[],
		length: number,
		speed: number,
		rotateRate: number,
		size: number,
		bodyEntitySpec?: { head: Entity; body: Entity; tail: Entity }
	) {
		this.clientId = clientId;
		this.positions = pos;
		this.directions = dir;
		this.length = length;
		this.speed = speed;
		this.rotateRate = rotateRate;
		this.size = size;

		let renderSize = 30;
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
				{ render: true, position: new Position(0, 0), width: renderSize, height: renderSize },
				{ std: headSprite }
			);
			this.body = new Entity(
				'std',
				{ render: true, position: new Position(0, 0), width: renderSize, height: renderSize },
				{ std: bodySprite }
			);
			this.tail = new Entity(
				'std',
				{ render: true, position: new Position(0, 0), width: renderSize, height: renderSize },
				{ std: bodySprite }
			);
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
		this.head.direction += this.rotateRate * elapsedTime;
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		this.reportUpdate = true;

		this.directions[0] -= this.rotateRate * elapsedTime;
		this.head.direction -= this.rotateRate * elapsedTime;
	}

	// Player consumes 'foods' food units
	eat(foodMap: { [foodId: string]: Food }) {
		let foodsAte: string[] = [];
		for (let foodId in foodMap) {
			let food = foodMap[foodId];

			if (this.headCollisionCheck(food.position)) {
				foodsAte.push(foodId);
				// console.log('ate', this.length, food.size);

				this.reportUpdate = true;
				this.length += Math.floor(food.size);
				let copy = this.positions.at(-1)!;
				this.positions.splice(-1, 0, structuredClone(copy));
			}
		}

		foodsAte.forEach((foodId) => {
			delete foodMap[foodId];
		});

		this.reportEat = foodsAte.length > 0;
	}

	// Continue movement based on current time
	update(elapsedTime: number) {
		// this.reportUpdate = true;
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

	private headCollisionCheck(pos: Position): boolean {
		// Calculate distance between player's head and the provided point
		const deltaX = this.positions[0].x - pos.x;
		const deltaY = this.positions[0].y - pos.y;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Check if the distance is less than or equal to the radius of the player's head
		return distance <= this.size / 2;
	}
}
