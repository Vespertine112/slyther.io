import { Entity } from '$lib/shared/entites/entity';
import { levels, type Game, Position, Vector, GameStatusEnum } from '$lib/client/gameTypes';
import Sprite from '$lib/shared/entites/sprite';
import { GameStateEnum } from './stateMachine';
import type { State } from './state';
import type InputManager from '$lib/inputManager';
import { fadeOutMusic, type Music } from '$lib/misc';
import { ParticleSystem } from '$lib/client/particles/particleSystem';
import { Random } from '$lib/shared/random';
import { CustomCommands } from '$lib/inputManager';

export class PlayingState implements State {
	game: Game;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	landerEntity!: Entity;
	inputManager: InputManager;
	music: Music;

	private oldCanvas!: { width: number; height: number };
	private canvasChangeOccured: boolean = false;
	private enumTracker: GameStateEnum = GameStateEnum.PlayingState;
	private thrustParticleSystem!: ParticleSystem;
	private explodeParticleSystem!: ParticleSystem;
	private internalUpdate!: (elapsedTime: number) => void;
	private internalRender!: () => void;
	private terrainPathCache: Path2D | null = null; // Used to cache the terrain pathing for fast draws - invalidates on canvas canvasSizeHasChanged
	private gameWinTimeout: number = 4000; // Miliseconds to next game after landing!

	constructor(lander: Game, canvas: HTMLCanvasElement, inputManager: InputManager, music: Music) {
		this.game = lander;
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.inputManager = inputManager;
		this.music = music;
	}

	enter(): void {
		this.oldCanvas = { width: this.canvas.width, height: this.canvas.height }; // Ensure up to date on enter.

		this.createAndAssignLanderEntity();
		this.assignInputs();
		this.createAndAssignParticleSystems();

		this.internalUpdate = this.regularGameUpdate;
		this.internalRender = this.regularGameRender;
		this.explodeParticleSystem.turnOn();
		this.gameWinTimeout = 4000;
	}

	processInput(elapsedTime: number): GameStateEnum {
		this.inputManager.update(elapsedTime);
		return this.enumTracker;
	}

	/**
	 * Updates generic state logic - then calls an internally changing update
	 * function which depends on the states internal game state
	 */
	update(elapsedTime: number): void {
		this.canvasChangeOccured = this.canvasSizeHasChanged();
		if (this.canvasChangeOccured) {
			this.updateLanderSizeAndPositionForCanvasChange();
			this.updateOldCanvasWithNew();
			this.invalidateTerrainCache();
		}

		this.updateParticleSystemPostitions();
		this.landerEntity.animationStep(elapsedTime);

		this.internalUpdate(elapsedTime);
	}

	render(elapsedTime: number): void {
		this.renderTerrain();
		this.internalRender();
	}

	exit(): void {
		this.inputManager.unRegisterCommand(['a', 'd', 'w', 'Escape']);
		this.game.exit();

		this.enumTracker = GameStateEnum.PlayingState;
		this.invalidateTerrainCache();
	}

	private regularGameUpdate(elapsedTime: number) {
		this.game.update(elapsedTime);
		this.thrustParticleSystem.update(elapsedTime);

		// Internal Game State Transitions!
		if (this.game.gameState == GameStatusEnum.Won) {
			this.music.levelWinSound.play();
			this.internalUpdate = this.gameWonUpdate;
			this.landerEntity.setState('landed');
			this.landerEntity.width! *= 3;
			this.newGame();
		}
		if (this.game.gameState == GameStatusEnum.Lost) {
			this.music.explosionSound.play();
			this.internalUpdate = this.gameLostUpdate;
			this.explodeParticleSystem.turnOffAfter(175);
		}
	}

	private regularGameRender() {
		this.renderLander();
		this.thrustParticleSystem.render();
		this.renderIntroTransparentBlackScreen();

		// Internal Game State Transitions!
		if (this.game.gameState == GameStatusEnum.Won) {
			this.internalRender = this.gameWonRender;
		}
		if (this.game.gameState == GameStatusEnum.Lost) {
			this.internalRender = this.gameLostRender;
		}
	}

	private gameWonUpdate(elapsedTime: number) {
		this.game.canvasChangeHookForTerrain();
		this.thrustParticleSystem.update(elapsedTime);
		this.gameWinTimeout -= elapsedTime;
	}

	private gameWonRender() {
		this.renderCountDownToNewGame();
		this.renderLander();
	}

	private gameLostUpdate(elapsedTime: number) {
		this.game.canvasChangeHookForTerrain();
		this.explodeParticleSystem.update(elapsedTime, 10);
	}

	private gameLostRender() {
		this.explodeParticleSystem.render();
	}

	private renderCountDownToNewGame() {
		let fontSize = Math.min(24, this.canvas.width / 20);

		this.ctx.save();
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.font = `${fontSize}pt silkscreen`;
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = '#43E121';
		this.ctx.strokeStyle = '#43E121';
		this.ctx.lineWidth = 5;

		let count = Math.floor(this.gameWinTimeout / 1000);
		this.ctx.fillText(`${count}`, this.canvas.width / 2, this.canvas.height / 2);
		this.ctx.stroke();
		this.ctx.restore();
	}

	private newGame() {
		// Resets the game after timeout
		setTimeout(() => {
			this.exit();

			let idx = levels.findIndex((lvl) => lvl.level === this.game.level.level);
			if (idx + 1 > levels.length - 1) {
				idx = 0;
			} else {
				idx += 1;
			}

			let nextLevel = levels.at(idx)!;
			this.game.aggregatePlayerScore += this.game.playerScore * (idx + 1);
			this.game.initalizeGame(nextLevel, this.canvas);

			this.enter();
		}, this.gameWinTimeout.valueOf());
	}

	private createAndAssignParticleSystems() {
		// This is a callback which is used to build a random momentum vector
		// for thrust particles! Cool!
		let thrustMomentum = (): Vector => {
			let inverseAngle = (this.landerEntity.direction + 180) % 360;
			let totalSpreadAngle = 100;
			let halfAngle = totalSpreadAngle / 2;

			let minAngle = (inverseAngle - halfAngle + 360) % 360;
			let maxAngle = (inverseAngle + halfAngle) % 360;
			if (minAngle > maxAngle) {
				minAngle -= 360;
			}

			const randomAngle = Random.nextRandomBetween(minAngle, maxAngle);
			const angleInRadians = randomAngle * (Math.PI / 180);
			const x = Math.cos(angleInRadians);
			const y = Math.sin(angleInRadians);

			return new Vector(y, -x).mult(Random.nextRandomBetween(2, 4));
		};

		// Assign the thrustMomentum callback to both particle systems
		this.thrustParticleSystem = new ParticleSystem(
			this.canvas,
			this.game.landerEntity.position,
			false,
			thrustMomentum
		);
		this.explodeParticleSystem = new ParticleSystem(this.canvas, this.game.landerEntity.position, true, () =>
			Random.nextCircleVector().mult(Random.nextRandomBetween(2, 4))
		);
	}

	private updateParticleSystemPostitions() {
		const centerX = this.landerEntity.position.x + this.landerEntity.width! / 2;
		const centerY = this.landerEntity.position.y + this.landerEntity.height! / 2;

		// Calculate the bottom of the lander based on its rotation
		const bottomX =
			centerX - (this.landerEntity.height! / 2) * Math.sin((this.landerEntity.direction * Math.PI) / 180);
		const bottomY =
			centerY + (this.landerEntity.height! / 2) * Math.cos((this.landerEntity.direction * Math.PI) / 180);

		let centerOfLander = new Position(centerX, centerY);
		const bottomOfLander = new Position(bottomX, bottomY);

		this.explodeParticleSystem.updateSystemPosition(centerOfLander);
		this.thrustParticleSystem.updateSystemPosition(bottomOfLander);
	}

	private assignInputs() {
		this.inputManager.registerCommand(
			[CustomCommands.RotRight],
			{
				fireRate: 2
			},
			() => {
				this.game.rotateShip(3);
			}
		);
		this.inputManager.registerCommand(
			[CustomCommands.RotLeft],
			{
				fireRate: 2
			},
			() => {
				this.game.rotateShip(-3);
			}
		);
		this.inputManager.registerCommand(
			[CustomCommands.Thrust],
			{
				fireRate: 10
			},
			() => {
				if (this.game.fuelLevel > 0) {
					this.music.thrustSound.volume = 0.2;
					this.music.thrustSound.play();
					this.game.applyThrust();
					this.thrustParticleSystem.generateParticles = true;
					if (this.game.gameState == GameStatusEnum.Playing) this.landerEntity.setState('thrust');
				} else {
					fadeOutMusic(this.music.thrustSound, 1000, 0.2);
					this.thrustParticleSystem.generateParticles = false;
					if (this.game.gameState == GameStatusEnum.Playing) this.landerEntity.setState('std');
				}
			},
			() => {
				fadeOutMusic(this.music.thrustSound, 1000, 0.2);
				this.thrustParticleSystem.generateParticles = false;
				if (this.game.gameState == GameStatusEnum.Playing) this.landerEntity.setState('std');
			}
		);
		this.inputManager.registerCommand(
			['Escape'],
			{
				fireOnce: true
			},
			() => {},
			() => {
				this.enumTracker = GameStateEnum.LevelSelectState;
			}
		);
	}

	private createAndAssignLanderEntity() {
		let lander_idle: Sprite = new Sprite(
			'sprites/Lander.png',
			{ render: true },
			{
				animate: true,
				fps: 10,
				animStartX: 0,
				animStartY: 0,
				animCropH: 22,
				animCropW: 20,
				sheetCols: 1,
				sheetRows: 1
			}
		);
		let lander_thrust: Sprite = new Sprite(
			'sprites/Lander_Thrust.png',
			{ render: true },
			{
				animate: true,
				fps: 15,
				animStartX: 0,
				animStartY: 0,
				animCropH: 22,
				animCropW: 20,
				sheetCols: 2,
				sheetRows: 1
			}
		);
		let lander_landed: Sprite = new Sprite(
			'sprites/Lander_LittleGuys.png',
			{ render: true },
			{
				animate: true,
				fps: 15,
				animStartX: 0,
				animStartY: 0,
				animCropH: 22,
				animCropW: 60,
				sheetCols: 1,
				sheetRows: 1
			}
		);

		let landerSize = Math.sqrt(this.canvas.height * this.canvas.width) * 0.04;
		this.landerEntity = new Entity(
			'std',
			{
				render: true,
				width: landerSize,
				height: landerSize,
				direction: 270,
				position: new Position(this.canvas.width * 0.05, this.canvas.height * 0.1),
				momentum: new Vector(8, -6)
			},
			{ std: lander_idle, thrust: lander_thrust, landed: lander_landed }
		);
		this.game.landerEntity = this.landerEntity;
	}

	private updateLanderSizeAndPositionForCanvasChange() {
		let landerSize = Math.sqrt(this.canvas.height * this.canvas.width) * 0.04;
		this.landerEntity.width = landerSize * (this.game.gameState == GameStatusEnum.Won ? 3 : 1);
		this.landerEntity.height = landerSize;

		const scaleY = this.canvas.height / this.oldCanvas.height;
		const scaleX = this.canvas.width / this.oldCanvas.width;

		this.landerEntity.position.x *= scaleX;
		this.landerEntity.position.y *= scaleY;
	}

	private updateOldCanvasWithNew() {
		this.oldCanvas.height = this.canvas.height;
		this.oldCanvas.width = this.canvas.width;
	}

	private canvasSizeHasChanged() {
		return this.canvas.height != this.oldCanvas.height || this.canvas.width != this.oldCanvas.width;
	}

	private renderTerrain(): void {
		this.ctx.save();
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.strokeStyle = '#FFFFFF';
		this.ctx.fillStyle = this.game.level.surfaceColor; // Set fill color
		this.ctx.lineWidth = 6;
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';
		this.ctx.imageSmoothingEnabled = false;

		if (!this.terrainPathCache) {
			this.terrainPathCache = new Path2D();
			let terMap = this.game.terrainElevationMap;
			let finalX = this.game.terrainElevationMap.at(-1)?.x;

			this.terrainPathCache.moveTo(terMap[0].x, terMap[0].y);
			for (let idx = 0; idx < terMap.length; idx++) {
				const position = terMap[idx];
				this.terrainPathCache.lineTo(position.x, position.y);
			}

			this.terrainPathCache.lineTo(finalX!, this.canvas.height);
			this.terrainPathCache.lineTo(0, this.canvas.height);
			this.terrainPathCache.lineTo(terMap[0].x, terMap[0].y);
			this.terrainPathCache.closePath();
		}

		// Fill and stroke the terrain path
		this.ctx.fill(this.terrainPathCache); // Fill the terrain path
		this.ctx.stroke(this.terrainPathCache);

		this.ctx.restore();
	}

	private invalidateTerrainCache() {
		this.terrainPathCache = null;
	}

	private renderIntroTransparentBlackScreen() {
		if (this.game && 1 - (this.game?.playTime ?? 0) / 2000 > -0.5) {
			this.ctx.save();
			let introSecondDurationMs = 3000;
			// Apply transparency
			this.ctx.globalAlpha = 1 - (this.game?.playTime ?? 0) / introSecondDurationMs;

			// Draw black square
			this.ctx.fillStyle = 'black';
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.restore();
		}
	}

	// Renders the player
	private renderLander() {
		// Handles the drop-shadow on the canvas
		this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
		this.ctx.shadowBlur = 10;
		this.ctx.shadowOffsetX = 5;
		this.ctx.shadowOffsetY = 5;

		let landerSprite = this.landerEntity.getActiveSprite();
		if (landerSprite.readyToRender && landerSprite.render) {
			this.ctx.save();
			this.ctx.imageSmoothingEnabled = false;

			this.ctx.translate(
				this.landerEntity.position.x + this.landerEntity.width! / 2,
				this.landerEntity.position.y + this.landerEntity.height! / 2
			);
			this.ctx.rotate((this.landerEntity.direction * Math.PI) / 180);

			this.ctx.drawImage(
				landerSprite.image,
				landerSprite.animStartX!,
				landerSprite.animStartY!,
				landerSprite.animCropW!,
				landerSprite.animCropH!,
				-this.landerEntity.width! / 2,
				-this.landerEntity.height! / 2,
				this.landerEntity.width!,
				this.landerEntity.height!
			);

			this.ctx.restore();
		}
	}
}
