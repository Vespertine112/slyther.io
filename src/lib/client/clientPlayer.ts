import { Random } from '../shared/random';
import { Food, Position } from '../shared/gameTypes';
import { Entity } from './entites/entity';
import Sprite from './entites/sprite';
import { Player, PlayerStates } from '$lib/shared/player';
import { MusicManager } from './music';
import type { ParticleSystem } from './particles/particleSystem';

export class ClientPlayer extends Player {
	head!: Entity;
	body!: Entity;
	tail!: Entity;

	musicManager: MusicManager = MusicManager.getInstance();
	particleSystem!: ParticleSystem;

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
		super(clientId, new Position(0, 0));
		this.positions = pos;
		this.directions = dir;
		this.length = length;
		this.speed = speed;
		this.rotateRate = rotateRate;
		this.size = size;

		this.initalizeBodyEntities(bodyEntitySpec);
	}

	// Rotates a player's head right
	rotateRight(elapsedTime: number) {
		super.rotateRight(elapsedTime);
		this.head.direction += this.rotateRate * elapsedTime;
	}

	// Rotates a player's head left
	rotateLeft(elapsedTime: number) {
		super.rotateLeft(elapsedTime);
		this.head.direction -= this.rotateRate * elapsedTime;
	}

	/**
	 * Client-side eat method. Mostly just plays the bite sound & throws particles
	 */
	eat() {
		this.musicManager.playSound('biteSound', false);
		this.particleSystem.turnOn();
		this.particleSystem.turnOffAfter(100);
	}

	update(elapsedTime: number) {
		super.update(elapsedTime);

		// Update particleSystem pos
		if (this.particleSystem) {
			let sysPos = new Position(this.positions[0].x + this.size / 2, this.positions[0].y + this.size / 2);
			this.particleSystem.updateSystemPosition(sysPos);
			this.particleSystem.direction = this.directions[0];
			this.particleSystem.update(elapsedTime);
		}
	}

	private initalizeBodyEntities(bodyEntitySpec: { head: Entity; body: Entity; tail: Entity } | undefined) {
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
}
