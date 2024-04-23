import { Food, Position, Vector } from '$lib/shared/gameTypes';
import type InputManager from '$lib/inputManager';
import { CustomCommands } from '$lib/inputManager';
import { Socket, io } from 'socket.io-client';
import { NetworkIds } from '$lib/shared/network-ids';
import { Queue } from '$lib/shared/queue';
import { ClientPlayer } from '$lib/client/clientPlayer';
import { Renderer } from './renderer';
import { PlayerStates } from '$lib/shared/player';
import { ParticleSystem } from './particles/particleSystem';
import { MusicManager } from './music';
import { Random } from '$lib/shared/random';

export enum GameStatusEnum {
	Playing,
	Won,
	Lost,
	Idle
}

/**
 * Game - All State for the lander game
 */
export class Game {
	playerScore: number = 0;
	playerRank = 1;
	playerBestRank = 1;
	playTime: number = 0;
	gameState: GameStatusEnum = GameStatusEnum.Idle;

	private canvas!: HTMLCanvasElement;
	private oldCanvas!: { width: number; height: number }; // Tracks canvas changes to re-size terrain on dynamic changes
	private renderer!: Renderer;
	private inputManager!: InputManager;
	private particleSystems: ParticleSystem[] = [];
	private musicManager: MusicManager = MusicManager.getInstance();

	private socket: Socket;
	private messageId = 0;
	private messageHistory = new Queue<any>();
	private networkQueue = new Queue<any>();

	private playerSelf!: ClientPlayer;
	private playerOthers: { [clientId: string]: ClientPlayer } = {};
	private foodMap: { [foodId: string]: Food } = {};
	leaderBoard: { name: string; clientId: string; length: number }[] = [];

	inputLatency = 0;

	constructor() {
		this.socket = io({ autoConnect: false });
		this.socket.connect();
	}

	initalizeGame(canvas: HTMLCanvasElement, inputManager: InputManager, playerName: string | null) {
		this.canvas = canvas;

		this.oldCanvas = { width: canvas.width, height: canvas.height };
		this.inputManager = inputManager;

		this.setupSocketListeners();

		this.registerKeyboardHandlers();

		this.gameState = GameStatusEnum.Playing;

		this.socket.emit(NetworkIds.REQUEST_NAME, playerName);
	}

	processInput(elapsedTime: number) {
		this.inputManager.update(elapsedTime);

		let processQueue = this.networkQueue;
		this.networkQueue = new Queue<any>();

		while (!processQueue.empty) {
			let message = processQueue.dequeue();
			switch (message?.type) {
				case NetworkIds.CONNECT_ACK:
					this.connectPlayerSelf(message.data);
					break;
				case NetworkIds.CONNECT_OTHER:
					this.connectPlayerOther(message.data);
					break;
				case NetworkIds.DISCONNECT_OTHER:
					this.disconnectPlayerOther(message.data);
					break;
				case NetworkIds.UPDATE_SELF:
					this.updatePlayerSelf(message.data);
					break;
				case NetworkIds.UPDATE_LEADERBOARD:
					this.leaderBoard = message.data.top5;
					this.playerRank = message.data.rank;
					if (this.playerRank > this.playerBestRank) this.playerBestRank = this.playerRank;
					break;
				case NetworkIds.UPDATE_OTHER:
					this.updatePlayerOther(message.data);
					break;
				case NetworkIds.UPDATE_NAME:
					if (message.data.clientId == this.playerSelf.clientId) {
						this.playerSelf.name = message.data;
					} else {
						this.playerOthers[message.data.clientId].name = message.data.name;
					}

					break;
				case NetworkIds.PLAYER_SELF_ATE:
					this.playerSelf.eat();
					break;
				case NetworkIds.UPDATE_FOODMAP:
					this.updateFoodMap(message.data);
					break;
				case NetworkIds.PLAYER_DEATH_SELF:
					this.playerDiedSelf(message.data);
					break;
				case NetworkIds.PLAYER_DEATH_OTHER:
					this.otherPlayerDied(message.data);
					break;
			}
		}
	}

	/**
	 * Hook for player self dying
	 */
	private playerDiedSelf(data) {
		this.playerSelf.state = PlayerStates.DEAD;

		let playerHeadPos = this.playerSelf.positions[0];
		let headExplosionPS = new ParticleSystem(
			this.canvas,
			new Position(playerHeadPos.x, playerHeadPos.y),
			this.renderer,
			true
		);
		headExplosionPS.turnOffAfter(125);
		this.particleSystems.push(headExplosionPS);

		this.musicManager?.playSound('playerDeathSound', false);

		this.gameState = GameStatusEnum.Lost;
	}

	/**
	 * Hook for another player dying
	 * Removes other player, plays death sound, and places particle systems
	 */
	private otherPlayerDied(data: any) {
		let playerHeadPos = this.playerOthers[data.clientId].positions[0];
		let headExplosionPS = new ParticleSystem(
			this.canvas,
			new Position(playerHeadPos.x, playerHeadPos.y),
			this.renderer,
			true
		);
		headExplosionPS.turnOffAfter(125);
		this.particleSystems.push(headExplosionPS);

		this.musicManager?.playMusic('playerDeathSound', false);

		delete this.playerOthers[data.clientId];
	}

	private updateFoodMap(data) {
		for (let i = 0; i < data.eaten.length; i++) {
			const foodId = data.eaten[i];
			delete this.foodMap[foodId];
		}

		for (let i = 0; i < data.new.length; i++) {
			const food = data.new[i];
			this.foodMap[food.name] = food;
		}
	}

	update(elapsedTime: number) {
		this.playerSelf?.update(elapsedTime);

		// This filter both updates & removes the particleSystems
		// The systems should only be around for 1.5 s
		this.particleSystems = this.particleSystems.filter((ps) => {
			ps.update(elapsedTime, 5);
			return ps.systemLifeTime < 1500;
		});

		for (let id in this.playerOthers) {
			this.playerOthers[id].update(elapsedTime);
		}

		this.playerScore = this.playerSelf?.length ?? 0;
	}

	render() {
		this.renderer?.updateWorldCoverage();

		this.renderer?.renderBackgroundTiles();

		this.playerSelf?.particleSystem?.render();

		this.particleSystems.forEach((ps) => {
			ps.render();
		});

		for (let name in this.foodMap) {
			this.renderer.renderFood(this.foodMap[name]);
		}

		for (let id in this.playerOthers) {
			let player = this.playerOthers[id];
			this.renderer.renderPlayer(player);
			this.renderer.renderPlayerName(player);
		}

		if (this.playerSelf && this.playerSelf.state == PlayerStates.ALIVE) {
			this.renderer.renderPlayer(this.playerSelf);
		}
	}

	private updatePlayerOther(data: any) {
		if (this.playerOthers.hasOwnProperty(data.clientId)) {
			let player = this.playerOthers[data.clientId];
			player.positions = data.positions;
			player.directions = data.directions;
			player.length = data.length;
			player.size = data.size;
			player.head.direction = data.direction;
		}
	}

	private updatePlayerSelf(data) {
		this.playerSelf.positions = data.positions;
		this.playerSelf.directions = data.directions;
		this.playerSelf.size = data.size;
		this.playerSelf.length = data.length;
		this.playerSelf.head.direction = data.direction;

		let done = false;
		while (!done && !this.messageHistory.empty) {
			if (this.messageHistory.front.id === data.lastMessageId) {
				done = true;
			}
			this.messageHistory.dequeue();
		}

		let memory = new Queue<any>();

		if (!this.messageHistory.empty) {
			this.inputLatency = performance.now() - this.messageHistory.front?.currentTime;
		}

		while (!this.messageHistory.empty) {
			let message = this.messageHistory.dequeue();
			switch (message.type) {
				case NetworkIds.INPUT_BOOST:
					this.playerSelf.boost(message.elapsedTime);
					break;
				case NetworkIds.INPUT_ROTATE_RIGHT:
					this.playerSelf.rotateRight(message.elapsedTime);
					break;
				case NetworkIds.INPUT_ROTATE_LEFT:
					this.playerSelf.rotateLeft(message.elapsedTime);
					break;
			}
			memory.enqueue(message);
		}

		this.messageHistory = memory;
	}

	setupSocketListeners() {
		let standardListeners = [
			NetworkIds.CONNECT_ACK,
			NetworkIds.CONNECT_OTHER,
			NetworkIds.DISCONNECT_OTHER,
			NetworkIds.UPDATE_SELF,
			NetworkIds.UPDATE_LEADERBOARD,
			NetworkIds.UPDATE_OTHER,
			NetworkIds.UPDATE_FOODMAP,
			NetworkIds.UPDATE_NAME,
			NetworkIds.PLAYER_SELF_ATE,
			NetworkIds.PLAYER_DEATH_SELF,
			NetworkIds.PLAYER_DEATH_OTHER
		];

		standardListeners.forEach((networkReq) => {
			this.socket.on(networkReq, (data) => {
				this.networkQueue.enqueue({
					type: networkReq,
					data: data
				});
			});
		});
	}

	registerKeyboardHandlers() {
		this.inputManager.registerCommand([CustomCommands.TurnRight], { fireOnce: false }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_ROTATE_RIGHT,
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.rotateRight(elapsedTime);
		});
		this.inputManager.registerCommand([CustomCommands.TurnLeft], { fireOnce: false }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_ROTATE_LEFT,
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.rotateLeft(elapsedTime);
		});
		this.inputManager.registerCommand([CustomCommands.Boost], { fireOnce: false }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_BOOST,
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.boost(elapsedTime);
		});
	}

	exit() {
		this.gameState = GameStatusEnum.Idle;
		this.socket.disconnect();
	}

	private connectPlayerSelf(data) {
		this.playerSelf = new ClientPlayer(
			this.socket.id!,
			data.positions,
			data.directions,
			data.length,
			data.speed,
			data.rotateRate,
			data.size
		);
		this.renderer = new Renderer(this.canvas, this.playerSelf);
		this.foodMap = data.foodMap;
		this.leaderBoard = data.leaderBoard;

		let eatParticles = function () {
			let degrees = (this.direction * 180) / Math.PI;
			degrees -= 90;

			let inverseAngle = (degrees + 180) % 360;
			let totalSpreadAngle = 75;
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

			let newVec = new Vector(y, -x).mult(Random.nextRandomBetween(1 / 600, 1 / 800));
			return newVec;
		};

		let ps = new ParticleSystem(this.canvas, this.playerSelf.positions[0], this.renderer, false, eatParticles);
		this.playerSelf.particleSystem = ps;
	}

	private connectPlayerOther(data) {
		let player = new ClientPlayer(
			data.clientId,
			data.positions,
			data.directions,
			data.length,
			data.speed,
			data.rotateRate,
			data.size
		);
		player.name = data.name;
		player.lastUpdate = performance.now();

		this.playerOthers[data.clientId] = player;
	}

	private disconnectPlayerOther(data) {
		delete this.playerOthers[data.clientId];
	}
}
