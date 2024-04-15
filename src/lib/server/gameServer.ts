import { Vector, Position } from '../shared/gameTypes';
import type { Server, Socket } from 'socket.io';
import { NetworkIds } from '../shared/network-ids';
import { Player } from './player';
import type { NetworkInputMessage, NetworkMessage } from '../shared/network-message';
import { Queue } from '../shared/queue';

interface Client {
	socket: Socket;
	player: Player;
	lastMessageId: number;
}

/**
 * [SERVER] Game Server
 */
export class GameServer {
	private quit: boolean = false;
	private lastUpdate: number = 0;
	private activeClients: { [clientId: string]: Client } = {};
	private inputQueue: Queue<NetworkInputMessage> = new Queue<NetworkInputMessage>();

	constructor() {}

	gameLoop() {
		let currentTime = performance.now();
		let elapsedTime = 0;

		while (!this.quit) {
			this.processInput(elapsedTime);
			this.update(elapsedTime, currentTime);
			this.updateClients(elapsedTime);

			elapsedTime = performance.now() - currentTime;
			currentTime = performance.now();
			this.quit = true;
		}
	}

	initalizeGame(socketServer: Server) {
		this.initalizeSocketIO(socketServer);

		console.log('\x1b[0;31m[WSS]\x1b[0m Server Started');

		this.gameLoop();
	}

	processInput(elapsedTime: number) {
		let processQueue = this.inputQueue;
		this.inputQueue = new Queue<NetworkInputMessage>();

		while (!processQueue.empty) {
			let input = processQueue.dequeue()!;
			let client = this.activeClients[input.clientId];
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
		for (let clientId in this.activeClients) {
			this.activeClients[clientId].player.update(currentTime);
		}

		// Perform collision checks for all snakes

		// Perform food collision checks (eating food)
	}

	updateClients(elapsedTime: number) {
		for (let clientId in this.activeClients) {
			let client = this.activeClients[clientId];

			let update = {
				clientId: clientId,
				lastMessageId: client.lastMessageId,
				direction: client.player.direction,
				position: client.player.position
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

			// Report any eats to clients
		}

		for (let clientId in this.activeClients) {
			this.activeClients[clientId].player.reportUpdate = false;
		}
	}

	initalizeSocketIO(socketServer: Server) {
		// Notify clients of new player connection
		const notifyConnect = (socket: Socket, newPlayer: Player) => {
			for (let clientId in this.activeClients) {
				let client = this.activeClients[clientId];

				if (newPlayer.clientId !== clientId) {
					client.socket.emit(NetworkIds.CONNECT_OTHER, {
						clientId: newPlayer.clientId,
						direction: newPlayer.direction,
						position: newPlayer.position,
						rotateRate: newPlayer.rotateRate,
						speed: newPlayer.speed,
						size: newPlayer.size
					});

					socket.emit(NetworkIds.CONNECT_OTHER, {
						clientId: client.player.clientId,
						direction: client.player.direction,
						position: client.player.position,
						rotateRate: client.player.rotateRate,
						speed: client.player.speed,
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
			console.log('Connection established: ', socket.id);

			// Create an entry in our list of connected clients
			let newPlayer = new Player(socket.id, new Position(0, 0));
			newPlayer.clientId = socket.id;
			this.activeClients[socket.id] = {
				socket: socket,
				player: newPlayer,
				lastMessageId: 0
			};

			socket.emit(NetworkIds.CONNECT_ACK, {
				direction: newPlayer.direction,
				position: newPlayer.position,
				size: newPlayer.size,
				rotateRate: newPlayer.rotateRate,
				speed: newPlayer.speed
			});

			socket.on(NetworkIds.INPUT, (data: NetworkMessage) => {
				this.inputQueue.enqueue({
					clientId: socket.id,
					message: data
				});
			});

			socket.on('disconnect', () => {
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
}