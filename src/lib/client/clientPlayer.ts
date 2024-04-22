import { Random } from '../shared/random';
import { Food, Position } from '../shared/gameTypes';
import { Entity } from './entites/entity';
import Sprite from './entites/sprite';
import { Player, PlayerStates } from '$lib/shared/player';
import { MusicManager } from './music';

export class ClientPlayer extends Player {
	head!: Entity;
	body!: Entity;
	tail!: Entity;

	musicManager: MusicManager = MusicManager.getInstance();

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
	 * Client-side eat method. Mostly just plays the bite sound
	 */
	eat() {
		this.musicManager.playSound('biteSound', false);
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
