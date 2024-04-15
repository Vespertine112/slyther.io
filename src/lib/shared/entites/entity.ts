import { Vector, Position } from '../gameTypes';
import Sprite from './sprite';

export class Entity {
	sprites: { [state: string]: Sprite }; // Aggregates sprites w/ state access
	private state: string;

	width?: number;
	height?: number;
	isHovered: boolean = false; // Flag for mouseover - Used in special occasions

	position: Position;
	momentum: Vector;
	direction: number; // Angle orientation in degrees
	lifeLength: number; // TTL
	timeAlive: number = 0;
	color?: string;

	private moveRatePerMs;

	constructor(
		state: string,
		propSpec: {
			render: boolean;
			position?: Position;
			momentum?: Vector;
			direction?: number;
			height?: number;
			width?: number;
			lifeLength?: number;
			moveRatePerMs?: number;
			color?: string;
		},
		sprites: { [state: string]: Sprite }
	) {
		this.state = state;
		this.sprites = sprites;

		this.direction = propSpec.direction ?? 0; // Begin all straight up
		this.position = propSpec.position ?? new Position(0, 0);
		this.momentum = propSpec.momentum ?? new Vector(0, 0);
		this.lifeLength = propSpec.lifeLength ?? 0;
		this.color = propSpec.color;

		this.height = propSpec.height;
		this.width = propSpec.width;
		this.moveRatePerMs = propSpec.moveRatePerMs ?? 1;
	}

	getState() {
		return this.state;
	}

	setState(state: string) {
		this.state = state;
	}

	getActiveSprite(): Sprite {
		return this.sprites[this.state];
	}

	animationStep(elapsedTime: number) {
		this.sprites[this.state].animationStep(elapsedTime);
		if (this.sprites.hasOwnProperty('decoration')) {
			this.sprites.decoration.animationStep(elapsedTime);
		}
	}

	setMoveRate(rate: number) {
		this.moveRatePerMs = rate;
	}
}
