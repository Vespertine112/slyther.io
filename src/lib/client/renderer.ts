import { Position } from '$lib/shared/gameTypes';
import type { Player } from '$lib/client/player';

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
		let canvasPos = this.translateGamePositionToCanvas(player.position);

		// Handles the drop-shadow on the canvas
		this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
		this.ctx.shadowBlur = 10;
		this.ctx.shadowOffsetX = 5;
		this.ctx.shadowOffsetY = 5;

		let playerSegment = player.head;
		let playerSegmentSprite = playerSegment.getActiveSprite();
		if (playerSegmentSprite.readyToRender && playerSegmentSprite.render) {
			this.ctx.save();

			this.ctx.translate(canvasPos.x + playerSegment.width! / 2, canvasPos.y + playerSegment.height! / 2);
			this.ctx.rotate(player.head.direction);

			this.ctx.drawImage(
				playerSegmentSprite.image,
				playerSegmentSprite.animStartX!,
				playerSegmentSprite.animStartY!,
				playerSegmentSprite.animCropW!,
				playerSegmentSprite.animCropH!,
				-playerSegment.width! / 2,
				-playerSegment.height! / 2,
				playerSegment.width!,
				playerSegment.height!
			);

			this.ctx.restore();
		}
	}

	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private translateGamePositionToCanvas(pos: Position) {
		let scaleRatio = Math.max(this.canvas.width, this.canvas.height);

		let canvasWidthScale = this.canvas.width / scaleRatio;
		let canvasHeightScale = this.canvas.height / scaleRatio;

		let viewportLeft = this.playerSelf.position.x - this.worldCoverage / 2;
		let viewportTop = this.playerSelf.position.y - this.worldCoverage / 2;

		let transPositionX = ((pos.x - viewportLeft) * this.canvas.width) / this.worldCoverage;
		let transPositionY = ((pos.y - viewportTop) * this.canvas.height) / this.worldCoverage;

		return new Position(transPositionX, transPositionY);
	}
}
