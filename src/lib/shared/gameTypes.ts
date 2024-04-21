/**
 * Game Position
 */
export class Position {
	x: number;
	y: number;
	prev: Position | undefined;
	next: Position | undefined;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	/**
	 * @param c Position object
	 * @returns boolean - if two positions are the same coordinates
	 */
	compare(c: Position | undefined): boolean {
		if (!c) return false;
		return c.x == this.x && c.y == this.y;
	}

	/**
	 * Generates a new position object given a vector applied to a point
	 */
	fromVector(vec: Vector) {
		return new Position(this.x + vec.x, this.y + vec.y);
	}
}

/**
 * Vector Class
 */
export class Vector {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	/**
	 * @returns number - computed magnitude of the vector
	 */
	getMagnitude(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/**
	 * Add another vector to this Vector
	 */
	add(other: Vector): Vector {
		this.x += other.x;
		this.y += other.y;

		return this;
	}

	mult(time: number): Vector {
		this.x *= time;
		this.y *= time;
		return this;
	}
}

export enum FoodType {
	REGULAR,
	INVINCIBILITY,
	SIZEUP,
	SPEEDUP
}
export class Food {
	radius: number;

	constructor(
		public name: string,
		public assetName: string,
		public size: number,
		public position: Position,
		public type: FoodType
	) {
		this.radius = size / 500;
	}
}
