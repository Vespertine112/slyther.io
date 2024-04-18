import { ServerEntity } from '$lib/server/entites/entity';
import { levels, type Game } from '$lib/client/gameTypes';
import type InputManager from '$lib/inputManager';
import Sprite from '$lib/server/entites/sprite';
import type { State } from './state';
import { GameStateEnum } from './stateMachine';

export class LevelSelectState implements State {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	inputManager: InputManager;

	private introTimeTracker: number = 0;
	private planets: { title: string; entity: ServerEntity; clickCallback: () => GameStateEnum }[] = [];

	private fontSize: number = 24;
	private outerPadding: number = 0;
	private innerPadding: number = 0;
	private planetSize: number = 0;
	private enumTracker: GameStateEnum = GameStateEnum.LevelSelectState;
	private lander: Game;

	constructor(canvas: HTMLCanvasElement, inputManager: InputManager, lander: Game) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.inputManager = inputManager;
		this.lander = lander;
	}

	enter(): void {
		// Build all entites
		let plutoSprite: Sprite = new Sprite(
			'sprites/Pluto.png',
			{ render: true },
			{ animate: true, fps: 17, animCropH: 150, animCropW: 150, sheetCols: 100, sheetRows: 1 }
		);
		let plutoEntity: ServerEntity = new ServerEntity('std', { render: true }, { std: plutoSprite });

		let ganymedeSprite: Sprite = new Sprite(
			'sprites/Ganymede.png',
			{ render: true },
			{ animate: true, fps: 17, animCropH: 150, animCropW: 150, sheetCols: 100, sheetRows: 1 }
		);
		let ganymedeEntity: ServerEntity = new ServerEntity('std', { render: true }, { std: ganymedeSprite });

		let moonSprite: Sprite = new Sprite(
			'sprites/Moon.png',
			{ render: true },
			{ animate: true, fps: 17, animCropH: 150, animCropW: 150, sheetCols: 100, sheetRows: 1 }
		);
		let moonEntity: ServerEntity = new ServerEntity('std', { render: true }, { std: moonSprite });

		let marsSprite: Sprite = new Sprite(
			'sprites/Mars.png',
			{ render: true },
			{ animate: true, fps: 17, animCropH: 150, animCropW: 150, sheetCols: 100, sheetRows: 1 }
		);
		let marsEntity: ServerEntity = new ServerEntity('std', { render: true }, { std: marsSprite });

		this.planets.length = 0;
		this.planets.push(
			{ title: 'Pluto', entity: plutoEntity, clickCallback: () => this.clickCallbackGeneric('Pluto') },
			{ title: 'Ganymede', entity: ganymedeEntity, clickCallback: () => this.clickCallbackGeneric('Ganymede') },
			{ title: 'Moon', entity: moonEntity, clickCallback: () => this.clickCallbackGeneric('Moon') },
			{ title: 'Mars', entity: marsEntity, clickCallback: () => this.clickCallbackGeneric('Mars') }
		);

		this.registerCommands();
	}

	private registerCommands() {
		this.inputManager.registerCommand(
			['Escape'],
			{ fireOnce: true },
			() => {},
			() => (this.enumTracker = GameStateEnum.MainMenuState)
		);
		this.inputManager.registerCommand(['MouseUp'], {}, () => {
			this.planets.forEach((planet) => {
				if (this.inPlanetSelectionBounds(planet.entity.position.x, planet.entity.position.y)) {
					this.enumTracker = planet.clickCallback();
				}
			});
		});
	}
	private clickCallbackGeneric(levelName: string): GameStateEnum {
		let level = levels.find((level) => level.level == levelName);
		if (!level) throw new Error("Couldn't match a level from selection!");

		this.lander.initalizeGame(level, this.canvas);
		return GameStateEnum.PlayingState;
	}

	processInput(elapsedTime: number): GameStateEnum {
		this.inputManager.update(elapsedTime);
		return this.enumTracker;
	}

	update(elapsedTime: number): void {
		this.introTimeTracker += elapsedTime;
		this.fontSize = Math.min(24, this.canvas.width / 20);
		this.outerPadding = (this.canvas.width * 0.2) / 2;
		this.innerPadding = (this.canvas.width / (this.planets.length - 1)) * 0.3;
		this.planetSize = (this.canvas.width / this.planets.length) * 0.5;

		this.planets.forEach((planet, idx) => {
			planet.entity.animationStep(elapsedTime);

			planet.entity.position.y = this.canvas.height / 2 - this.planetSize / 2;
			planet.entity.position.x = this.outerPadding + this.innerPadding * idx + this.planetSize * idx;

			if (this.inPlanetSelectionBounds(planet.entity.position.x, planet.entity.position.y)) {
				planet.entity.isHovered = true;
			} else {
				planet.entity.isHovered = false;
			}
		});
	}

	render(elapsedTime: number): void {
		this.renderLevels();

		this.renderIntroTransparentBlackScreen();
	}

	exit(): void {
		this.inputManager.unRegisterCommand(['MouseUp', 'Escape']);

		this.enumTracker = GameStateEnum.LevelSelectState;
	}

	private renderLevels() {
		// this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.renderBackgrounds();

		this.renderPlanetLabels();

		this.renderPlanets();
	}

	private renderPlanetLabels() {
		this.planets.forEach((planet) => {
			this.ctx.save();
			this.ctx.imageSmoothingEnabled = false;
			this.ctx.font = `${this.fontSize}pt silkscreen`;
			this.ctx.textAlign = 'center';
			this.ctx.fillStyle = '#43E121';
			this.ctx.strokeStyle = '#43E121';
			this.ctx.lineWidth = 5;

			const padding = this.innerPadding * 0.3;

			let y = planet.entity.position.y;
			let x = planet.entity.position.x;

			this.ctx.fillText(planet.title, x + this.planetSize / 2, y - padding * 0.2, this.planetSize);

			this.ctx.restore();
		});
	}

	private renderBackgrounds() {
		this.planets.forEach((planet) => {
			this.ctx.save();
			this.ctx.imageSmoothingEnabled = false;
			this.ctx.font = `${this.fontSize}pt silkscreen`;
			this.ctx.textAlign = 'center';
			this.ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
			this.ctx.strokeStyle = '#43E121';
			this.ctx.lineWidth = 5;

			// Padding from the surface of planet to edge of selection option.
			const padding = this.innerPadding * 0.3;
			const cornerRadius = 10;

			let y = planet.entity.position.y;
			let x = planet.entity.position.x;

			this.ctx.beginPath();
			// Top Left
			this.ctx.moveTo(x - padding, y - padding);
			// Top Right to Bottom Right
			this.ctx.arcTo(
				x + this.planetSize + padding,
				y - padding,
				x + this.planetSize + padding,
				y + this.planetSize + padding,
				cornerRadius
			);
			// Bottom right to Bottom Left
			this.ctx.arcTo(
				x + this.planetSize + padding,
				y + this.planetSize + padding,
				x - padding,
				y + this.planetSize + padding,
				cornerRadius
			);
			// Bottom Left to Top Left
			this.ctx.arcTo(x - padding, y + this.planetSize + padding, x - padding, y - padding, cornerRadius);
			// Top Left to Top Right
			this.ctx.arcTo(x - padding, y - padding, x + this.planetSize + padding, y - padding, cornerRadius);

			this.ctx.closePath();

			// If the planet is hovered, then re-draw the opaque background several times to indicate hover status
			for (let index = 0; index < (planet.entity.isHovered ? 3 : 1); index++) {
				this.ctx.stroke();
				this.ctx.fill();
			}

			this.ctx.restore();
		});
	}

	private renderPlanets() {
		this.planets.forEach((planet, idx) => {
			let planetSprite = planet.entity.getActiveSprite();
			if (planetSprite.readyToRender && planetSprite.render) {
				this.ctx.save();
				this.ctx.imageSmoothingEnabled = false;

				this.ctx.drawImage(
					planetSprite.image,
					planetSprite.animStartX!,
					planetSprite.animStartY!,
					planetSprite.animCropW!,
					planetSprite.animCropH!,
					planet.entity.position.x,
					planet.entity.position.y,
					this.planetSize,
					this.planetSize
				);

				this.ctx.restore();
			}
		});
	}

	private renderIntroTransparentBlackScreen() {
		if (this.introTimeTracker && 1 - (this.introTimeTracker ?? 0) / 2000 > -0.5) {
			this.ctx.save();
			let introSecondDurationMs = 3000;
			// Apply transparency
			this.ctx.globalAlpha = 1 - (this.introTimeTracker ?? 0) / introSecondDurationMs;

			// Draw black square
			this.ctx.fillStyle = 'black';
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.restore();
		}
	}

	private inPlanetSelectionBounds(x: number, y: number) {
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = this.inputManager.mousePosition.x - rect.left;
		const mouseY = this.inputManager.mousePosition.y - rect.top;

		return mouseX > x && mouseX < x + this.planetSize && mouseY > y && mouseY < y + this.planetSize;
	}
}
