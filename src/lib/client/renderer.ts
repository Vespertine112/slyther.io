import type { Position } from '$lib/shared/gameTypes';
import type { Player } from '$lib/shared/player';

export class Renderer {
	ctx: CanvasRenderingContext2D;

	/**
	 * The viewport only covers a square of the overall world.
	 * The worldCoverage what fraction of the world is visible at at time
	 */
	worldCoverage: number = 1 / 3;

	constructor(
		public canvas: HTMLCanvasElement,
		public playerSelf: Player
	) {
		this.ctx = canvas.getContext('2d')!;
	}

	/**
	 * Renders (a) player on the canvas.
	 * @param player The player to render.
	 */
	renderPlayerOther(player: Player) {
		// Draw the player as a circle
		this.ctx.beginPath();
		this.ctx.arc(player.position.x, player.position.y, player.size, 0, Math.PI * 2);
		this.ctx.fillStyle = '#FF0000'; // Red color
		this.ctx.fill();
		this.ctx.closePath();
	}

	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private translateGamePositionToCanvas(pos: Position) {
		let scaleRatio = Math.max(this.canvas.width, this.canvas.height);

		let totalCanvasWidth = this.canvas.width / scaleRatio;
		let totalCanvasHeight = this.canvas.height / scaleRatio;
	}
}
