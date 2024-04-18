import { Vector, Position } from '../../shared/gameTypes';

/**
 * Server Entity - A data container mirror for a client-side entity
 */
export class ServerEntity {
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

	parent: ServerEntity | undefined;
	child: ServerEntity | undefined;

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
		}
	) {
		this.state = state;

		this.direction = propSpec.direction ?? 0; // Begin all straight up
		this.position = propSpec.position ?? new Position(0, 0);
		this.momentum = propSpec.momentum ?? new Vector(0, 0);
		this.lifeLength = propSpec.lifeLength ?? 0;
		this.color = propSpec.color;

		this.height = propSpec.height;
		this.width = propSpec.width;
		this.moveRatePerMs = propSpec.moveRatePerMs ?? 1;
	}
}
