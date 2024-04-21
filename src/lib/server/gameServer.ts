import { Vector, Position, Food } from '../shared/gameTypes';
import type { Server, Socket } from 'socket.io';
import { NetworkIds } from '../shared/network-ids';
import { ServerPlayer } from './serverPlayer';
import { Queue } from '../shared/queue';
import { Random } from '../shared/random';
import { sineIn } from 'svelte/easing';
import { Player, PlayerStates } from '../shared/player';

interface Client {
	socket: Socket;
	player: ServerPlayer;
	lastMessageId: number;
}

/**
 * [SERVER] Game Server
 */
export class GameServer {
	private quit: boolean = false;
	private lastUpdate: number = 0;
	private activeClients: { [clientId: string]: Client } = {};
	private inputQueue: Queue<any> = new Queue<any>();

	/** Global food map - Players modify this during update! */
	private foodMap: { [foodId: string]: Food } = {};

	constructor() {}

	gameLoop() {
		let lastTime = performance.now();
		let quit = false;

		const loop = () => {
			if (quit) return;

			const currentTime = performance.now();
			const elapsedTime = currentTime - lastTime;

			if (elapsedTime > 50) {
				this.log(`[Warning] Frame Time: ${Math.trunc(elapsedTime)}`);
			}

			this.processInput(elapsedTime);
			this.update(elapsedTime, currentTime);
			this.updateClients(elapsedTime);

			lastTime = currentTime;

			const nextInterval = Math.min(1, elapsedTime); // Ensure at least 1 ms interval. If it runs too fast we loop-out the server lol
			setTimeout(loop, nextInterval);
		};

		loop();
	}

	initalizeGame(socketServer: Server) {
		this.initalizeSocketIO(socketServer);

		this.log('Game Server Started');

		this.initalizeFoodMap();

		this.gameLoop();
	}

	processInput(elapsedTime: number) {
		let processQueue = this.inputQueue;
		this.inputQueue = new Queue<any>();

		while (!processQueue.empty) {
			let input = processQueue.dequeue()!;
			let client = this.activeClients[input.clientId];
			if (!client) continue; // Handle input collision when sockets error
			client.lastMessageId = input.message.id;
			switch (input.message.type) {
				case NetworkIds.INPUT_BOOST:
					client.player.boost(input.message.elapsedTime);
					break;
				case NetworkIds.INPUT_ROTATE_LEFT:
					client.player.rotateLeft(input.message.elapsedTime);
					break;
				case NetworkIds.INPUT_ROTATE_RIGHT:
					client.player.rotateRight(input.message.elapsedTime);
					break;
			}
		}
	}

	update(elapsedTime: number, currentTime: number) {
		// Perform Client update actions
		for (let clientId in this.activeClients) {
			this.activeClients[clientId].player.update(elapsedTime);
			this.activeClients[clientId].player.eat(this.foodMap);
		}

		// Perform collision checks for all snakes
		for (let clientId in this.activeClients) {
			let player = this.activeClients[clientId].player;
			if (player.state != PlayerStates.ALIVE) continue;
			let hasCollided = false;

			for (let otherClientId in this.activeClients) {
				let otherPlayer = this.activeClients[otherClientId].player;
				if (clientId == otherClientId || otherPlayer.state != PlayerStates.ALIVE) continue;

				for (let i = 0; i < otherPlayer.positions.length; i++) {
					const bodyPart = otherPlayer.positions[i];
					if (player.headCollisionCheck(bodyPart)) {
						this.log(`[Player Died] ${clientId}`);
						player.state = PlayerStates.DEAD;
						hasCollided = true;
						break;
					}
				}

				if (hasCollided) break;
			}
		}
	}

	updateClients(elapsedTime: number) {
		// Aggregate consumed foods & Player Deaths
		let foodsEaten: Food[] = [];
		let deadPlayers: string[] = [];
		for (let clientId in this.activeClients) {
			let player = this.activeClients[clientId].player;
			if (player.state == PlayerStates.DEAD) {
				deadPlayers.push(clientId);
			}

			if (player.eatenFoods.length > 0) {
				foodsEaten.concat(player.eatenFoods);
			}
		}

		// Remove consumed foods from map;
		for (let idx = 0; idx < foodsEaten.length; idx++) {
			delete this.foodMap[foodsEaten[idx].name];
		}

		// Update clients w/ new events & states
		for (let clientId in this.activeClients) {
			let client = this.activeClients[clientId];
			client.socket.emit(NetworkIds.UPDATE_FOODMAP, { foodMap: this.foodMap });

			if (client.player.state == PlayerStates.DEAD) {
				client.socket.emit(NetworkIds.PLAYER_DEATH_SELF);

				for (let otherId in this.activeClients) {
					if (otherId !== clientId && this.activeClients[otherId].player.state !== PlayerStates.DEAD) {
						this.activeClients[otherId].socket.emit(NetworkIds.PLAYER_DEATH_OTHER, { clientId: clientId });
					}
				}
			}

			let update = {
				clientId: clientId,
				lastMessageId: client.lastMessageId,
				directions: client.player.directions,
				positions: client.player.positions,
				speed: client.player.speed,
				length: client.player.length,
				size: client.player.size
				// updateWindow: lastUpdate
			};

			if (client.player.reportUpdate) {
				client.socket.emit(NetworkIds.UPDATE_SELF, update);

				//
				// Notify all other connected clients about every
				// other connected client status...but only if they are updated.
				for (let otherId in this.activeClients) {
					if (otherId !== clientId) {
						this.activeClients[otherId].socket.emit(NetworkIds.UPDATE_OTHER, update);
					}
				}
			}

			// Report any deaths to clients
		}

		for (let clientId in this.activeClients) {
			this.activeClients[clientId].player.reportUpdate = false;
		}
	}

	initalizeSocketIO(socketServer: Server) {
		// Notify clients of new player connection
		const notifyConnect = (socket: Socket, newPlayer: ServerPlayer) => {
			for (let clientId in this.activeClients) {
				let client = this.activeClients[clientId];

				if (newPlayer.clientId !== clientId) {
					client.socket.emit(NetworkIds.CONNECT_OTHER, {
						clientId: newPlayer.clientId,
						directions: newPlayer.directions,
						positions: newPlayer.positions,
						rotateRate: newPlayer.rotateRate,
						speed: newPlayer.speed,
						length: newPlayer.length,
						size: newPlayer.size
					});

					socket.emit(NetworkIds.CONNECT_OTHER, {
						clientId: client.player.clientId,
						directions: client.player.directions,
						positions: client.player.positions,
						rotateRate: client.player.rotateRate,
						speed: client.player.speed,
						length: client.player.length,
						size: client.player.size
					});
				}
			}
		};

		// Notify clients of player disconnection
		const notifyDisconnect = (playerId: string) => {
			for (let clientId in this.activeClients) {
				let client = this.activeClients[clientId];
				if (playerId !== clientId) {
					client.socket.emit(NetworkIds.DISCONNECT_OTHER, {
						clientId: playerId
					});
				}
			}
		};

		socketServer.on('connection', (socket) => {
			this.log('Connection   :', socket.id);

			// Create an entry in our list of connected clients
			let newPlayer = new ServerPlayer(socket.id, this.getValidPostitionForNewPlayer());
			newPlayer.clientId = socket.id;
			this.activeClients[socket.id] = {
				socket: socket,
				player: newPlayer,
				lastMessageId: 0
			};

			socket.emit(NetworkIds.CONNECT_ACK, {
				directions: newPlayer.directions,
				positions: newPlayer.positions,
				length: newPlayer.length,
				size: newPlayer.size,
				rotateRate: newPlayer.rotateRate,
				speed: newPlayer.speed,
				foodMap: this.foodMap
			});

			socket.on(NetworkIds.INPUT, (data) => {
				this.inputQueue.enqueue({
					clientId: socket.id,
					message: data
				});
			});

			socket.on('disconnect', () => {
				this.log(`Disconnection: ${socket.id}`);
				delete this.activeClients[socket.id];
				notifyDisconnect(socket.id);
			});

			notifyConnect(socket, newPlayer);
		});
	}

	// Kills the game server
	exit() {
		this.quit = true;
	}

	private getValidPostitionForNewPlayer(): Position {
		return new Position(0.5, 0.5);
	}

	private initalizeFoodMap() {
		const numFood = 1000;

		for (let i = 0; i < numFood; i++) {
			this.foodMap[`${i}`] = new Food(
				`${i}`,
				Random.nextRandomBetween(1, 1.2),
				new Position(Random.nextRandomBetween(0, 1), Random.nextRandomBetween(0, 1))
			);
		}
	}

	private log(...s: string[]) {
		console.log(`\x1b[0;31m[WSS]\x1b[0m ${s}`);
	}
}
