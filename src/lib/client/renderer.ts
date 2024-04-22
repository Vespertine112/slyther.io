import { Food, Position } from '$lib/shared/gameTypes';
import type { ClientPlayer } from '$lib/client/clientPlayer';
import { Entity } from './entites/entity';
import Sprite from './entites/sprite';
import { foodFiles } from '$lib/shared/misc';
import type { ParticleSystem } from './particles/particleSystem';

export class Renderer {
	ctx: CanvasRenderingContext2D;
	private foodEntities: { [foodName: string]: Entity } = {};
	private particleSystems: ParticleSystem[] = [];

	/**
	 * Tile Entites are the background of the world.
	 */
	private backgroundTile!: Entity;
	private edgeTile!: Entity;

	/*
	 * tileWorldCoverage determines how much of the
	 * a tile should covers (world units, i.e. < 1)
	 */
	private tileWorldCoverage: number = 1 / 40;

	/**
	 * The viewport only covers a square of the overall world.
	 * The worldCoverage what fraction of the world is visible at at time
	 * The renderer tracks where the player is and bases coord translations off that.
	 * THIS WILL BE DYNAMICALLY SET BASED ON PLAYER SIZE
	 */
	worldCoverage: number = 1 / 5;

	constructor(
		public canvas: HTMLCanvasElement,
		public playerSelf: ClientPlayer
	) {
		this.ctx = canvas.getContext('2d')!;
		this.updateWorldCoverage();
		this.initBackgroundTileEntities();
		this.initFoodEntities();
	}

	updateWorldCoverage() {
		this.worldCoverage = this.playerSelf.size * 30;
	}

	/**
	 * Optimized background tile rendering
	 * Only renders tiles which are within viewport
	 */
	renderBackgroundTiles() {
		let tileDimNum = 1 / this.tileWorldCoverage;
		this.ctx.save();
		this.ctx.imageSmoothingEnabled = false;

		for (let x = 0; x < tileDimNum; x++) {
			for (let y = 0; y < tileDimNum; y++) {
				const tileTopLeftPos = new Position(x * this.tileWorldCoverage, y * this.tileWorldCoverage);
				const tileTopLeft = this.translateGamePositionToCanvas(tileTopLeftPos);
				const tileDimension = this.convertWorldLengthToPixels(this.tileWorldCoverage);

				let backgroundSprite = this.backgroundTile.getActiveSprite();

				if (x == 0 || x == tileDimNum - 1 || y == 0 || y == tileDimNum - 1) {
					backgroundSprite = this.edgeTile.getActiveSprite();
				}

				if (
					this.viewportRectangleCollisionCheck(tileTopLeftPos, this.tileWorldCoverage, this.tileWorldCoverage)
				) {
					this.ctx.drawImage(
						backgroundSprite.image,
						backgroundSprite.animStartX!,
						backgroundSprite.animStartY!,
						backgroundSprite.animCropW!,
						backgroundSprite.animCropH!,
						tileTopLeft.x,
						tileTopLeft.y,
						tileDimension,
						tileDimension
					);
				}
			}
		}
		this.ctx.restore();
	}

	/**
	 * Renders (a) player on the canvas.
	 * @param player The player to render.
	 */
	renderPlayer(player: ClientPlayer) {
		// Handles the drop-shadow on the canvas
		let adjustedPlayerSize = this.convertWorldLengthToPixels(player.size);

		let currentEntity: Entity | undefined = player.tail;
		for (let idx = player.positions.length - 1; idx >= 0; idx--) {
			if (idx == 0) currentEntity = player.head;
			if (idx > 0 && idx < player.positions.length - 1) currentEntity = player.body;

			const bodySegPos = player.positions[idx];
			const bodySegDir = player.directions[idx];

			if (!this.viewportCircleCollisionCheck(bodySegPos, player.size)) {
				continue;
			}

			const canvasPos = this.translateGamePositionToCanvas(bodySegPos);

			let playerSegmentSprite = currentEntity.getActiveSprite();
			if (playerSegmentSprite.readyToRender && playerSegmentSprite.render) {
				this.ctx.save();

				// Translate and rotate based on segment position and direction
				this.ctx.translate(canvasPos.x + currentEntity.width! / 2, canvasPos.y + currentEntity.height! / 2);
				this.ctx.rotate(bodySegDir);

				// Draw the segment
				this.ctx.drawImage(
					playerSegmentSprite.image,
					playerSegmentSprite.animStartX!,
					playerSegmentSprite.animStartY!,
					playerSegmentSprite.animCropW!,
					playerSegmentSprite.animCropH!,
					-adjustedPlayerSize / 2,
					-adjustedPlayerSize / 2,
					adjustedPlayerSize!,
					adjustedPlayerSize!
				);

				this.ctx.restore();
			}
		}
	}

	/**
	 * Renders a food item on the canvas.
	 * @param food The food item to render.
	 */
	renderFood(food: Food) {
		this.ctx.save();
		this.ctx.imageSmoothingEnabled = false;

		const foodEntity = this.foodEntities[food.assetName];
		if (!this.viewportCircleCollisionCheck(food.position, food.radius)) {
			return;
		}

		const canvasPos = this.translateGamePositionToCanvas(food.position);
		const foodSprite = foodEntity.getActiveSprite();
		const foodSize = this.convertWorldLengthToPixels(food.radius);

		// Check if the sprite is ready to render
		if (foodSprite.readyToRender && foodSprite.render) {
			// Draw the food entity
			this.ctx.drawImage(
				foodSprite.image,
				foodSprite.animStartX!,
				foodSprite.animStartY!,
				foodSprite.animCropW!,
				foodSprite.animCropH!,
				canvasPos.x!,
				canvasPos.y!,
				foodSize!,
				foodSize!
			);
		}

		this.ctx.restore();
	}

	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private viewportCircleCollisionCheck(pos: Position, radius: number): boolean {
		// Calculate the distance between the center of the circle and the player's position
		const deltaX = pos.x - this.playerSelf.positions[0].x;
		const deltaY = pos.y - this.playerSelf.positions[0].y;
		const distanceSquared = deltaX * deltaX + deltaY * deltaY;
		const radiusSquared = radius * radius;
		const viewportRadiusSquared = this.worldCoverage ** 2;

		// Check if the circle is within the viewport by comparing the squared distances
		return distanceSquared - radiusSquared <= viewportRadiusSquared;
	}

	/**
	 * Check for viewport Collision (rectangular)
	 * All positions & sizing are expected in respect world
	 */
	private viewportRectangleCollisionCheck(topLeft: Position, width: number, height: number): boolean {
		const playerX = this.playerSelf.positions[0].x;
		const playerY = this.playerSelf.positions[0].y;

		// Calculate the coordinates of the rectangle's bottom-right corner
		const bottomRightX = topLeft.x + width;
		const bottomRightY = topLeft.y + height;

		// Check if any corner of the rectangle is within the viewport
		return (
			this.viewportPointCollisionCheck(topLeft) ||
			this.viewportPointCollisionCheck(new Position(bottomRightX, topLeft.y)) ||
			this.viewportPointCollisionCheck(new Position(topLeft.x, bottomRightY)) ||
			this.viewportPointCollisionCheck(new Position(bottomRightX, bottomRightY)) ||
			// Check if any edge of the rectangle intersects with the viewport
			this.viewportLineCollisionCheck(topLeft, new Position(bottomRightX, topLeft.y)) ||
			this.viewportLineCollisionCheck(
				new Position(bottomRightX, topLeft.y),
				new Position(bottomRightX, bottomRightY)
			) ||
			this.viewportLineCollisionCheck(
				new Position(bottomRightX, bottomRightY),
				new Position(topLeft.x, bottomRightY)
			) ||
			this.viewportLineCollisionCheck(new Position(topLeft.x, bottomRightY), topLeft)
		);
	}

	private viewportPointCollisionCheck(pos: Position): boolean {
		return (
			pos.x >= this.playerSelf.positions[0].x - this.worldCoverage / 2 &&
			pos.x <= this.playerSelf.positions[0].x + this.worldCoverage / 2 &&
			pos.y >= this.playerSelf.positions[0].y - this.worldCoverage / 2 &&
			pos.y <= this.playerSelf.positions[0].y + this.worldCoverage / 2
		);
	}

	private viewportLineCollisionCheck(start: Position, end: Position): boolean {
		const minX = Math.min(start.x, end.x);
		const maxX = Math.max(start.x, end.x);
		const minY = Math.min(start.y, end.y);
		const maxY = Math.max(start.y, end.y);

		return (
			this.viewportPointCollisionCheck(start) || // Check if the start point is within the viewport
			this.viewportPointCollisionCheck(end) || // Check if the end point is within the viewport
			// Check if any part of the line segment intersects with the viewport
			(minX <= this.playerSelf.positions[0].x + this.worldCoverage / 2 &&
				maxX >= this.playerSelf.positions[0].x - this.worldCoverage / 2 &&
				minY <= this.playerSelf.positions[0].y + this.worldCoverage / 2 &&
				maxY >= this.playerSelf.positions[0].y - this.worldCoverage / 2)
		);
	}

	/**
	 * Translates a given world position to an accurate canvas position
	 */
	translateGamePositionToCanvas(pos: Position): Position {
		let scaleRatio = Math.max(this.canvas.width, this.canvas.height);
		let cw = this.canvas.width / scaleRatio;
		let ch = this.canvas.height / scaleRatio;

		let viewportLeft = this.playerSelf.positions[0].x - (this.worldCoverage / 2) * cw;
		let viewportTop = this.playerSelf.positions[0].y - (this.worldCoverage / 2) * ch;

		let transPositionX = ((pos.x - viewportLeft) * this.canvas.width) / cw / this.worldCoverage;
		let transPositionY = ((pos.y - viewportTop) * this.canvas.height) / ch / this.worldCoverage;

		return new Position(transPositionX, transPositionY);
	}

	/**
	 * Convert a world length to pixels for rendering
	 * Assumes that the len < 1
	 */
	private convertWorldLengthToPixels(len: number) {
		let scaleRatio = Math.max(this.canvas.width, this.canvas.height);

		let canvasWidthScale = this.canvas.width / scaleRatio;

		let theoreticWorldLengthInPixels = this.canvas.width / canvasWidthScale / this.worldCoverage;

		return len * theoreticWorldLengthInPixels;
	}

	/**
	 * Adds a particle system to the renderer
	 */
	addParticleSystem(ps: ParticleSystem) {
		this.particleSystems.push(ps);
	}

	private initBackgroundTileEntities() {
		let backgroundSprite = new Sprite(
			'assets/backgrounds/Mossy_Brick_tile.png',
			{ render: true },
			{
				animate: false,
				animStartX: 0,
				animStartY: 0,
				animCropH: 16,
				animCropW: 16,
				sheetCols: 1,
				sheetRows: 1
			}
		);

		this.backgroundTile = new Entity(
			'std',
			{ render: true, position: new Position(0, 0), width: 1, height: 1 },
			{ std: backgroundSprite }
		);

		let edgeSprite = new Sprite(
			'assets/backgrounds/Dirt_tile.png',
			{ render: true },
			{
				animate: false,
				animStartX: 0,
				animStartY: 0,
				animCropH: 16,
				animCropW: 16,
				sheetCols: 1,
				sheetRows: 1
			}
		);

		this.edgeTile = new Entity(
			'std',
			{ render: true, position: new Position(0, 0), width: 1, height: 1 },
			{ std: edgeSprite }
		);
	}

	private initFoodEntities() {
		// Loop through foodFiles array to create sprites and entities for each food item
		for (const food of foodFiles) {
			const foodSprite = new Sprite(
				`assets/foods/${food.fileName}`, // Assuming food images are stored in 'assets/foods' directory
				{ render: true },
				{
					animate: false,
					animStartX: 0,
					animStartY: 0,
					animCropH: 16,
					animCropW: 16,
					sheetCols: 1,
					sheetRows: 1
				}
			);

			const foodEntity = new Entity(
				'std',
				{ render: true, position: new Position(0, 0), width: 1, height: 1 }, // Adjust position, width, and height as needed
				{ std: foodSprite }
			);

			// Store the food entity in a property indexed by the name of the food
			// Assuming you have a property named 'foodEntities' to store the entities
			this.foodEntities[food.name] = foodEntity;
		}
	}
}
