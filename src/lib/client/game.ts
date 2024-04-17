import type { Entity } from '../shared/entites/entity';
import { Random } from '../shared/random';
import { Position, Vector } from '$lib/shared/gameTypes';
import type InputManager from '$lib/inputManager';
import { CustomCommands } from '$lib/inputManager';
import { Socket, io } from 'socket.io-client';
import type {
	NetworkInputMessage,
	NetworkMessage,
	PlayerUpdateMessage,
	STCNetworkMessage
} from '$lib/shared/network-message';
import { NetworkIds } from '$lib/shared/network-ids';
import { Queue } from '$lib/shared/queue';
import { Player } from '$lib/shared/player';

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
	playerScore: number = 100;
	playTime: number = 0;
	gameState: GameStatusEnum = GameStatusEnum.Idle;

	private canvas!: HTMLCanvasElement;
	private oldCanvas!: { width: number; height: number }; // Tracks canvas changes to re-size terrain on dynamic changes
	private inputManager!: InputManager;
	private socket: Socket;
	private messageId = 0;
	private messageHistory = new Queue<NetworkMessage>();
	private networkQueue = new Queue<STCNetworkMessage>();
	private playerSelf: Player;
	private playerOthers: { [clientId: string]: Player } = {};

	constructor() {
		this.socket = io();
		this.playerSelf = new Player(this.socket.id!);
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
		this.networkQueue = new Queue<STCNetworkMessage>();

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
			}
		}
	}

	update(elapsedTime: number) {
		this.canvasChangeHookForTerrain();

		this.playerSelf.update(elapsedTime);

		for (let id in this.playerOthers) {
			this.playerOthers[id].update(elapsedTime);
		}
	}

	render() {}

	private updatePlayerOther(data: any) {
		if (this.playerOthers.hasOwnProperty(data.clientId)) {
			let player = this.playerOthers[data.clientId];
			player.updateWindow = data.updateWindow;

			player.position = data.position;
			player.direction = data.direction;
		}
	}

	private updatePlayerSelf(data: PlayerUpdateMessage) {
		this.playerSelf.position = data.position;
		this.playerSelf.direction = data.direction;

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
			}
			memory.enqueue(message);
		}

		this.messageHistory = memory;
	}

	setupSocketListeners() {
		this.socket.on(NetworkIds.CONNECT_ACK, (data) => {
			this.networkQueue.enqueue({
				type: NetworkIds.CONNECT_ACK,
				data: data
			});
		});

		this.socket.on(NetworkIds.CONNECT_OTHER, (data) => {
			this.networkQueue.enqueue({
				type: NetworkIds.CONNECT_OTHER,
				data: data
			});
		});

		this.socket.on(NetworkIds.DISCONNECT_OTHER, (data) => {
			this.networkQueue.enqueue({
				type: NetworkIds.DISCONNECT_OTHER,
				data: data
			});
		});

		this.socket.on(NetworkIds.UPDATE_SELF, (data) => {
			this.networkQueue.enqueue({
				type: NetworkIds.UPDATE_SELF,
				data: data
			});
		});

		this.socket.on(NetworkIds.UPDATE_OTHER, (data) => {
			this.networkQueue.enqueue({
				type: NetworkIds.UPDATE_OTHER,
				data: data
			});
		});
	}

	registerKeyboardHandlers() {
		this.inputManager.registerCommand([CustomCommands.TurnRight], { fireOnce: true }, (elapsedTime) => {
			let message: NetworkMessage = {
				id: this.messageId,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_ROTATE_RIGHT
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
		});
		this.inputManager.registerCommand([CustomCommands.TurnLeft], { fireOnce: false }, (elapsedTime) => {
			let message: NetworkMessage = {
				id: this.messageId,
				elapsedTime: elapsedTime,
				type: NetworkIds.INPUT_ROTATE_LEFT
			};
			this.socket.emit(NetworkIds.INPUT, message);
			this.messageHistory.enqueue(message);
		});
	}

	exit() {
		this.gameState = GameStatusEnum.Idle;
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

	private connectPlayerSelf(data: PlayerUpdateMessage) {
		this.playerSelf.position = data.position;

		this.playerSelf.size = data.size;

		this.playerSelf.direction = data.direction;
		this.playerSelf.speed = data.speed;
		this.playerSelf.rotateRate = data.rotateRate;
	}

	private connectPlayerOther(data: PlayerUpdateMessage) {
		let player = new Player(data.id);
		player.position = data.position;
		player.direction = data.direction;
		player.lastUpdate = performance.now();

		player.position.x = data.position.x;
		player.position.y = data.position.y;
		player.direction = data.direction;
		player.updateWindow = 0;

		player.size = data.size;

		this.playerOthers[data.id] = player;
	}

	private disconnectPlayerOther(data: NetworkMessage) {
		delete this.playerOthers[data.id];
	}

	private generateThrustVector(angleInDegrees: number, magnitude: number): Vector {
		const angleInRadians = (angleInDegrees * Math.PI) / 180;
		const thrustX = -magnitude * Math.cos(angleInRadians);
		const thrustY = magnitude * Math.sin(angleInRadians);
		const angledVector = new Vector(thrustY, thrustX);

		return angledVector;
	}
}
