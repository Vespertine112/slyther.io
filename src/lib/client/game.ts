import { Food, FoodType, Position, Vector } from '$lib/shared/gameTypes';
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
import { foodFiles } from '$lib/shared/misc';

export enum GameStatusEnum {
	Playing,
	Won,
	Lost,
	Idle,
	Connecting
}

/**
 * Game - All State for the lander game
 */
export class Game {
	gameState: GameStatusEnum = GameStatusEnum.Idle;
	foodMap: { [foodId: string]: Food } = {};

	inputLatency = 0;
	leaderBoard: { name: string; clientId: string; length: number }[] = [];
	playTime: number = 0;
	playerScore: number = 0;
	playerRank = 1;
	playerBestRank = 1;

	private canvas!: HTMLCanvasElement;
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

	constructor() {
		this.socket = io({ autoConnect: false });
	}

	initalizeGame(canvas: HTMLCanvasElement, inputManager: InputManager, playerName: string | null) {
		this.canvas = canvas;
		this.inputManager = inputManager;

		this.setupSocketListeners();

		this.registerKeyboardHandlers();

		this.gameState = GameStatusEnum.Connecting;

		this.socket.connect();

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
					if (message.data.clientId == this.playerSelf?.clientId) {
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

		this.playerScore = this.playerSelf?.score ?? 0;
	}

	render() {
		this.renderer?.updateSizers();

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

		this.musicManager?.playSound('playerDeathSound', false);

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

	private updatePlayerOther(data: any) {
		if (this.playerOthers.hasOwnProperty(data.clientId)) {
			let player = this.playerOthers[data.clientId];
			player.positions = data.positions;
			player.direction = data.direction;
			player.length = data.length;
			player.size = data.size;
			player.score = data.score;
			player.head.direction = data.direction;
			player.tpsIdx = data.tpsIdx;

			for (const [tpIdx, tp] of Object.entries(data.tps)) {
				player.tps[tpIdx] = tp;
			}
		}
	}

	private updatePlayerSelf(data) {
		this.playerSelf.positions = data.positions;
		this.playerSelf.direction = data.direction;
		this.playerSelf.size = data.size;
		this.playerSelf.score = data.score;
		this.playerSelf.length = data.length;
		this.playerSelf.head.direction = data.direction;
		this.playerSelf.tpsIdx = data.tpsIdx;

		// Diff the tps into the clients tps
		for (const [tpIdx, tp] of Object.entries(data.tps)) {
			this.playerSelf.tps[tpIdx] = tp;
		}

		this.inputLatency = performance.now() - this.messageHistory.front?.currentTime || 0;

		let done = false;
		while (!done && !this.messageHistory.empty) {
			if (this.messageHistory.front.id === data.lastMessageId) {
				done = true;
			}
			this.messageHistory.dequeue();
		}

		let memory = new Queue<any>();

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
				case NetworkIds.INPUT_SNAP_TURN:
					this.playerSelf.snapTurn(message.elapsedTime);
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
		this.inputManager.registerCommand([CustomCommands.RotateRight], { fireOnce: false }, (elapsedTime) => {
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

		this.inputManager.registerCommand([CustomCommands.RotateLeft], { fireOnce: false }, (elapsedTime) => {
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

		this.inputManager.registerCommand([CustomCommands.TurnUp], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: -Math.PI / 2, // Snap angle for turning up
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn(-Math.PI / 2);
		});

		this.inputManager.registerCommand([CustomCommands.UpRight], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: -Math.PI / 4, // Snap angle for turning upright
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn(-Math.PI / 4);
		});

		this.inputManager.registerCommand([CustomCommands.TurnRight], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: 0, // Snap angle for turning right
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn(0);
		});

		this.inputManager.registerCommand([CustomCommands.DownRight], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: Math.PI / 4, // Snap angle for turning up
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn(Math.PI / 4);
		});

		this.inputManager.registerCommand([CustomCommands.TurnDown], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: Math.PI / 2, // Snap angle for turning down
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn(Math.PI / 2);
		});

		this.inputManager.registerCommand([CustomCommands.DownLeft], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: (3 * Math.PI) / 4, // Snap angle for turning down
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn((3 * Math.PI) / 4);
		});

		this.inputManager.registerCommand([CustomCommands.TurnLeft], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: Math.PI, // Snap angle for turning left
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn(Math.PI);
		});

		this.inputManager.registerCommand([CustomCommands.UpLeft], { fireOnce: true }, (elapsedTime) => {
			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: (-3 * Math.PI) / 4, // Snap angle for turning left
				currentTime: performance.now()
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
			this.playerSelf.snapTurn((-3 * Math.PI) / 4);
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

		this.inputManager.registerCommand([CustomCommands.MouseMove], { fireOnce: false }, (elapsedTime) => {
			let mouseX = this.inputManager.mousePosition.x;
			let mouseY = this.inputManager.mousePosition.y;

			let headCanvasPos = this.renderer?.translateGamePositionToCanvas(this.playerSelf.positions[0]);
			if (!headCanvasPos) return;

			let deltaX = mouseX - headCanvasPos.x;
			let deltaY = mouseY - headCanvasPos.y;
			let angle = Math.atan2(deltaY, deltaX);

			let message = {
				id: this.messageId++,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_SNAP_TURN,
				turnAngle: angle,
				currentTime: performance.now()
			};

			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);

			this.playerSelf?.snapTurn(angle);
		});
	}

	exit() {
		this.gameState = GameStatusEnum.Idle;
		this.inputManager?.getMappedCustomCommands().forEach((command) => {
			this.inputManager?.unRegisterCommand([command.command]);
		});
		this.socket.disconnect();

		// Nullify references to prevent potential memory leaks
		this.canvas = null;
		this.renderer = null;
		this.inputManager = null;
		this.particleSystems = [];
		this.musicManager = null;
		this.socket = null;
		this.playerSelf = null;
		this.playerOthers = {};
		this.foodMap = {};
	}

	private connectPlayerSelf(data) {
		this.playerSelf = new ClientPlayer(
			this.socket.id!,
			data.positions,
			data.direction,
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

		let psPos = new Position(this.playerSelf.positions[0].x, this.playerSelf.positions[0].y);
		let ps = new ParticleSystem(this.canvas, psPos, this.renderer, false, eatParticles);
		this.playerSelf.particleSystem = ps;

		this.gameState = GameStatusEnum.Playing;
	}

	private connectPlayerOther(data) {
		let player = new ClientPlayer(
			data.clientId,
			data.positions,
			data.direction,
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

	/**
	 * This method is only exposed for usage in the main menu! Don't call this without prior knowledge going on...
	 */
	addRandomFoodToMap(numFood: number) {
		let foodAssetNames: string[] = [];
		for (let { name } of foodFiles) {
			foodAssetNames.push(name);
		}

		for (let i = 0; i < numFood; i++) {
			let randomName = foodAssetNames[Math.floor(foodAssetNames.length * Math.random())];

			this.foodMap[`${i}`] = new Food(
				`${i}`,
				randomName,
				Random.nextRandomBetween(4, 7),
				{ x: Random.nextRandomBetween(0, 1), y: Random.nextRandomBetween(0, 1) },
				FoodType.REGULAR
			);
		}
	}
}
