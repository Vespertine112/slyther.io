import type { Player } from '$lib/shared/player';

export class Renderer {
	ctx: CanvasRenderingContext2D;

	constructor(public canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	/**
	 * Renders the player as a circle on the canvas.
	 * @param player The player to render.
	 */
	renderPlayer(player: Player) {
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
}
