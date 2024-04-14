import type { Music } from '$lib/shared/misc';
import type InputManager from '$lib/inputManager';
import type { State } from './state';
import { GameStateEnum } from './stateMachine';

export class MainMenuState implements State {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	inputManager: InputManager;

	private enumTracker: GameStateEnum = GameStateEnum.MainMenuState;
	private fontSize: number;
	private startY: number; // Dictates where to start drawing the menu!
	private music: Music;
	private menuOptions: {
		title: string;
		x: number;
		y: number;
		clickCallback: () => GameStateEnum;
	}[] = [
		{
			title: ' Menu ',
			x: 0,
			y: 0,
			clickCallback: () => GameStateEnum.MainMenuState
		},
		{
			title: ' New Game ',
			x: 0,
			y: 0,
			clickCallback: () => {
				this.music.backgroundMusic.play();
				return GameStateEnum.LevelSelectState;
			}
		},
		{
			title: ' High Scores ',
			x: 0,
			y: 0,
			clickCallback: () => GameStateEnum.HighScoresState
		},
		{
			title: ' Controls ',
			x: 0,
			y: 0,
			clickCallback: () => GameStateEnum.CustomControlsState
		},
		{
			title: ' Credits ',
			x: 0,
			y: 0,
			clickCallback: () => GameStateEnum.CreditsState
		}
	];

	constructor(canvas: HTMLCanvasElement, inputManager: InputManager, music: Music) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.inputManager = inputManager;
		this.fontSize = Math.min(24, this.canvas.width / 20);
		this.music = music;
	}

	enter(): void {
		this.inputManager.registerCommand(['MouseUp'], {}, () => {
			for (const option of this.menuOptions) {
				if (this.inTextBounds(option.title, option.x, option.y, this.fontSize)) {
					this.enumTracker = option.clickCallback();
				}
			}
		});
	}

	processInput(elapsedTime: number): GameStateEnum {
		this.inputManager.update(elapsedTime);
		return this.enumTracker;
	}

	update(elapsedTime: number): void {
		this.startY = this.canvas.height * 0.35;
		this.fontSize = Math.min(24, this.canvas.width / 20);

		// Calculate center positioning for each option. We recalculate on each update incase the canvas had re-sized!
		this.menuOptions.forEach((option, idx) => {
			const y = this.startY + idx * this.fontSize * 3; // NOTE: Magic number '3' controls the spacing between the options!
			const x = this.canvas.width / 2;
			option.x = x;
			option.y = y;
		});
	}

	render(elapsedTime: number): void {
		this.renderMenuBackground();
		this.renderMenuOptions();
	}

	exit(): void {
		this.inputManager.unRegisterCommand(['MouseUp']);

		this.enumTracker = GameStateEnum.MainMenuState;
	}

	private renderMenuBackground() {
		this.ctx.save();
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.font = `${this.fontSize}pt silkscreen`;
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		this.ctx.strokeStyle = '#43E121';
		this.ctx.lineWidth = 5;

		const padding = 36;
		const cornerRadius = 10;

		let finalY = this.menuOptions[this.menuOptions.length - 1].y;
		let x = this.canvas.width / 2;

		let metrics = this.ctx.measureText('M');
		let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

		let largestTextWidth: number = this.menuOptions.reduce(
			(maxWidth, current) =>
				this.ctx.measureText(current.title).width > maxWidth
					? this.ctx.measureText(current.title).width
					: maxWidth,
			0
		);

		this.ctx.beginPath();
		// Top Left
		this.ctx.moveTo(x - largestTextWidth / 2 - padding, this.startY - textHeight - padding);
		// Top Right to Bottom Right
		this.ctx.arcTo(
			x + largestTextWidth / 2 + padding,
			this.startY - textHeight - padding,
			x + largestTextWidth / 2 + padding,
			finalY + padding,
			cornerRadius
		);
		// Bottom right to Bottom Left
		this.ctx.arcTo(
			x + largestTextWidth / 2 + padding,
			finalY + padding,
			x - largestTextWidth / 2 - padding,
			finalY + padding,
			cornerRadius
		);
		// Bottom Left to Top Left
		this.ctx.arcTo(
			x - largestTextWidth / 2 - padding,
			finalY + padding,
			x - largestTextWidth / 2 - padding,
			this.startY - textHeight - padding,
			cornerRadius
		);
		// Top Left to Top Right
		this.ctx.arcTo(
			x - largestTextWidth / 2 - padding,
			this.startY - textHeight - padding,
			x + largestTextWidth / 2 + padding,
			this.startY - textHeight - padding,
			cornerRadius
		);

		this.ctx.closePath();
		this.ctx.stroke();
		this.ctx.fill();

		this.ctx.restore();
	}

	private renderMenuOptions() {
		this.ctx.save();
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.font = `${this.fontSize}pt silkscreen`;
		this.ctx.fillStyle = '#43e121';
		this.ctx.textAlign = 'center';

		// Draw the menu options
		this.menuOptions.forEach((option, idx) => {
			const text = option.title;
			const y = this.startY + idx * this.fontSize * 3; // NOTE: Magic number '3' controls the spacing between the options!
			const x = this.canvas.width / 2;
			this.renderText(text, x, y, this.fontSize);
		});

		this.ctx.restore();
	}

	// Performs a bound check on text. x & y are respective center for the text on canvas
	private inTextBounds(text: string, x: number, y: number, fontSize: number) {
		this.ctx.save();
		this.ctx.font = `${fontSize}pt silkscreen`;
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = this.inputManager.mousePosition.x - rect.left;
		const mouseY = this.inputManager.mousePosition.y - rect.top;
		const textWidth = this.ctx.measureText(text).width;

		this.ctx.restore();
		return mouseX > x - textWidth / 2 && mouseX < x + textWidth / 2 && mouseY > y - fontSize && mouseY < y;
	}

	private renderText(text: string, x: number, y: number, fontSize: number) {
		const textWidth = this.ctx.measureText(text).width;
		// Hover effect! Does the opaque background on hover!
		if (this.inTextBounds(text, x, y, fontSize)) {
			this.ctx.save();
			let metrics = this.ctx.measureText(text);
			let textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
			const padding = 15;
			const cornerRadius = 10;
			this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';

			this.ctx.strokeStyle = 'black';
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			// Top Left
			this.ctx.moveTo(x - textWidth / 2 - padding, y - textHeight - padding);
			// Top Right to Bottom Right
			this.ctx.arcTo(
				x + textWidth / 2 + padding,
				y - textHeight - padding,
				x + textWidth / 2 + padding,
				y + padding,
				cornerRadius
			);
			// Bottom right to Bottom Left
			this.ctx.arcTo(
				x + textWidth / 2 + padding,
				y + padding,
				x - textWidth / 2 - padding,
				y + padding,
				cornerRadius
			);
			// Bottom Left to Top Left
			this.ctx.arcTo(
				x - textWidth / 2 - padding,
				y + padding,
				x - textWidth / 2 - padding,
				y - textHeight - padding,
				cornerRadius
			);
			// Top Left to Top Right
			this.ctx.arcTo(
				x - textWidth / 2 - padding,
				y - textHeight - padding,
				x + textWidth / 2 + padding,
				y - textHeight - padding,
				cornerRadius
			);
			this.ctx.closePath();
			this.ctx.fill();
			this.ctx.restore();
			this.canvas.style.cursor = 'pointer';
		}

		this.ctx.fillText(text, x, y);
	}
}
