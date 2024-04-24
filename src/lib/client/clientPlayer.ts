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

	/**
	 * Client-side eat method. Mostly just plays the bite sound & throws particles
	 */
	eat() {
		this.musicManager.playSound('biteSound', false, 0.3);

		this.particleSystem.turnOn();
		this.particleSystem.turnOffAfter(20);
	}

	update(elapsedTime: number) {
		super.update(elapsedTime);

		// Update particleSystem pos
		if (this.particleSystem) {
			this.particleSystem.position.x = this.positions[0].x + this.size / 2;
			this.particleSystem.position.y = this.positions[0].y + this.size / 2;

			this.particleSystem.direction = this.directions[0];
			this.particleSystem.update(elapsedTime, 3);
		}
	}

	private initalizeBodyEntities(bodyEntitySpec: { head: Entity; body: Entity; tail: Entity } | undefined) {
		let renderSize = 30;
		if (!bodyEntitySpec) {
			let headSprite = new Sprite(
				'assets/snakes/Self_head.png',
				{ render: true },
				{
					animate: false,
					animStartX: 0,
					animStartY: 0,
					animCropH: 34,
					animCropW: 32,
					sheetCols: 1,
					sheetRows: 1
				}
			);
			let bodySprite = new Sprite(
				'assets/snakes/Self_body.png',
				{ render: true },
				{
					animate: false,
					animStartX: 0,
					animStartY: 0,
					animCropH: 32,
					animCropW: 32,
					sheetCols: 1,
					sheetRows: 1
				}
			);
			let tailSprite = new Sprite(
				'assets/snakes/Self_tail.png',
				{ render: true },
				{
					animate: false,
					animStartX: 0,
					animStartY: 0,
					animCropH: 32,
					animCropW: 32,
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
				{ std: tailSprite }
			);
		}
	}
}
