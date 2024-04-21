import { Food, Position, Vector } from '$lib/shared/gameTypes';
import type InputManager from '$lib/inputManager';
import { CustomCommands } from '$lib/inputManager';
import { Socket, io } from 'socket.io-client';
import { NetworkIds } from '$lib/shared/network-ids';
import { Queue } from '$lib/shared/queue';
import { ClientPlayer } from '$lib/client/clientPlayer';
import { Renderer } from './renderer';
import { PlayerStates } from '$lib/shared/player';

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
	playTime: number = 0;
	gameState: GameStatusEnum = GameStatusEnum.Idle;

	private canvas!: HTMLCanvasElement;
	private oldCanvas!: { width: number; height: number }; // Tracks canvas changes to re-size terrain on dynamic changes
	private renderer!: Renderer;
	private inputManager!: InputManager;

	private socket: Socket;
	private messageId = 0;
	private messageHistory = new Queue<any>();
	private networkQueue = new Queue<any>();

	private playerSelf!: ClientPlayer;
	private playerOthers: { [clientId: string]: ClientPlayer } = {};
	private foodMap: { [foodId: string]: Food } = {};

	inputLatency = 0;

	constructor() {
		this.socket = io({ autoConnect: false });
		this.socket.connect();
	}

	initalizeGame(canvas: HTMLCanvasElement, inputManager: InputManager) {
		this.canvas = canvas;

		this.oldCanvas = { width: canvas.width, height: canvas.height };
		this.inputManager = inputManager;

		this.setupSocketListeners();

		this.registerKeyboardHandlers();
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
				case NetworkIds.UPDATE_OTHER:
					this.updatePlayerOther(message.data);
					break;
				case NetworkIds.UPDATE_FOODMAP:
					this.foodMap = message.data.foodMap;
					break;
				case NetworkIds.PLAYER_DEATH_SELF:
					this.playerSelf.state = PlayerStates.DEAD;
					break;
				case NetworkIds.PLAYER_DEATH_OTHER:
					delete this.playerOthers[message.data.clientId];
					break;
			}
		}
	}

	update(elapsedTime: number) {
		this.canvasChangeHookForTerrain();

		this.playerSelf?.update(elapsedTime);

		for (let id in this.playerOthers) {
			this.playerOthers[id].eat(this.foodMap);
			this.playerOthers[id].update(elapsedTime);
		}

		this.playerScore = this.playerSelf?.length ?? 0;
	}

	render() {
		this.renderer?.updateWorldCoverage();

		this.renderer?.renderBackgroundTiles();

		for (let name in this.foodMap) {
			this.renderer.renderFood(this.foodMap[name]);
		}

		for (let id in this.playerOthers) {
			let player = this.playerOthers[id];
			this.renderer.renderPlayer(player);
		}

		if (this.playerSelf) {
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
		// console.log(this.inputLatency);

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
			NetworkIds.UPDATE_OTHER,
			NetworkIds.UPDATE_FOODMAP,
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

	canvasChangeHookForTerrain() {
		if (this.canvasSizeHasChanged()) {
			this.updatePositionsAndSizeForCanvasChange();
			this.updateOldCanvasWithNew();
		}
	}

	private updatePositionsAndSizeForCanvasChange() {
		const scaleY = this.canvas.height / this.oldCanvas.height;
		const scaleX = this.canvas.width / this.oldCanvas.width;
	}

	private updateOldCanvasWithNew() {
		this.oldCanvas.height = this.canvas.height;
		this.oldCanvas.width = this.canvas.width;
	}

	private canvasSizeHasChanged() {
		return this.canvas.height != this.oldCanvas.height || this.canvas.width != this.oldCanvas.width;
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
		player.lastUpdate = performance.now();

		this.playerOthers[data.clientId] = player;
	}

	private disconnectPlayerOther(data) {
		delete this.playerOthers[data.clientId];
	}
}
