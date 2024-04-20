import { Food, Position } from '$lib/shared/gameTypes';
import type { Player } from '$lib/client/player';
import type { Entity } from './entites/entity';

export class Renderer {
	ctx: CanvasRenderingContext2D;

	/**
	 * The viewport only covers a square of the overall world.
	 * The worldCoverage what fraction of the world is visible at at time
	 * The renderer tracks where the player is and bases coord translations off that.
	 */
	worldCoverage: number = 1 / 5;

	constructor(
		public canvas: HTMLCanvasElement,
		public playerSelf: Player
	) {
		this.ctx = canvas.getContext('2d')!;
	}

	updateWorldCover() {
		this.worldCoverage;
	}

	/**
	 * Renders (a) player on the canvas.
	 * @param player The player to render.
	 */
	renderPlayer(player: Player) {
		// Handles the drop-shadow on the canvas
		this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
		this.ctx.shadowBlur = 10;
		this.ctx.shadowOffsetX = 5;
		this.ctx.shadowOffsetY = 5;

		let adjustedPlayerSize = this.convertWorldLengthToPixels(player.size);
		// console.log(adjustedPlayerSize);

		let currentEntity: Entity | undefined = player.tail;
		for (let idx = player.positions.length - 1; idx >= 0; idx--) {
			if (idx == 0) currentEntity = player.head;
			if (idx > 0 && idx < player.positions.length - 1) currentEntity = player.body;

			const bodySegPos = player.positions[idx];
			const bodySegDir = player.directions[idx];

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
	 * Renders a food item on the canvas as a circle.
	 * @param food The food item to render.
	 */
	renderFood(food: Food) {
		this.ctx.fillStyle = 'red';
		const canvasPos = this.translateGamePositionToCanvas(food.position);

		this.ctx.beginPath();
		this.ctx.arc(canvasPos.x, canvasPos.y, this.convertWorldLengthToPixels(food.radius), 0, Math.PI * 2);
		this.ctx.fill();
		this.ctx.closePath();
	}

	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private translateGamePositionToCanvas(pos: Position) {
		let scaleRatio = Math.max(this.canvas.width, this.canvas.height);

		let canvasWidthScale = this.canvas.width / scaleRatio;
		let canvasHeightScale = this.canvas.height / scaleRatio;

		let viewportLeft = this.playerSelf.positions[0].x - this.worldCoverage / 2;
		let viewportTop = this.playerSelf.positions[0].y - this.worldCoverage / 2;

		let transPositionX = ((pos.x - viewportLeft) * this.canvas.width) / this.worldCoverage;
		let transPositionY = ((pos.y - viewportTop) * this.canvas.height) / this.worldCoverage;

		return new Position(transPositionX, transPositionY);
	}

	/**
	 * Convert a world length to pixels for rendering
	 * Assumes that the len < 1
	 */
	private convertWorldLengthToPixels(len: number) {
		let scaleRatio = Math.max(this.canvas.width, this.canvas.height);

		let canvasWidthScale = this.canvas.width / scaleRatio;
		let canvasHeightScale = this.canvas.height / scaleRatio;

		let viewportLeft = this.playerSelf.positions[0].x - this.worldCoverage / 2;
		let viewportRight = this.playerSelf.positions[0].x + this.worldCoverage / 2;

		let theoreticWorldLengthInPixels =
			((viewportRight - viewportLeft) * (this.canvas.width / canvasWidthScale)) / this.worldCoverage;

		return len * theoreticWorldLengthInPixels;
	}
}
