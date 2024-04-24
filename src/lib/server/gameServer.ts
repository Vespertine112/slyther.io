import { Position, Food, FoodType } from '../shared/gameTypes';
import type { Server, Socket } from 'socket.io';
import { NetworkIds } from '../shared/network-ids';
import { ServerPlayer } from './serverPlayer';
import { Queue } from '../shared/queue';
import { Random } from '../shared/random';
import { PlayerStates } from '../shared/player';
import { foodFiles } from '../shared/misc';

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
	private activeClients: { [clientId: string]: Client } = {};
	private inputQueue: Queue<any> = new Queue<any>();

	/** Global food map - Players modify this during update! */
	private foodMap: { [foodId: string]: Food } = {};
	private maximumFood = 1000;
	private foodCounter = 0;
	/** Tracks which foods are dynamically added during a loop */
	private foodsAdded: Food[] = [];
	private leaderBoard: { name: string; clientId: string; length: number }[] = [];

	constructor() {
		this.foodMap = {};
	}

	gameLoop() {
		let lastTime = performance.now();
		let quit = false;

		const loop = () => {
			if (quit) return;

			const currentTime = performance.now();
			const elapsedTime = currentTime - lastTime;

			if (elapsedTime > 30) {
				this.log(`[Warning] Frame Time: ${Math.trunc(elapsedTime)}`);
			}

			this.processInput(elapsedTime);
			this.update(elapsedTime, currentTime);
			this.updateClients(elapsedTime);

			this.foodsAdded = [];

			lastTime = currentTime;

			const nextInterval = Math.min(1, elapsedTime); // Ensure at least 1 ms interval. If it runs too fast we loop-out the server lol
			setTimeout(loop, nextInterval);
		};

		loop();
	}

	initalizeGame(socketServer: Server) {
		this.initalizeFoodMap();

		this.initalizeSocketIO(socketServer);

		this.log('Game Server Started');

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

		// Add food to map (only if players are playing)
		if (Object.entries(this.foodMap).length < this.maximumFood && Object.entries(this.activeClients).length > 0) {
			// this.addRandomFoodToMap(1);
		}

		// Perform collision checks for all snakes
		for (let clientId in this.activeClients) {
			let player = this.activeClients[clientId].player;
			if (player.state != PlayerStates.ALIVE) continue;
			let hasCollided = false;

			// WORLD BOUNDARY CHECK
			let playerHeadPos = player.positions[0];
			if (playerHeadPos.x < 0 || playerHeadPos.x > 1 || playerHeadPos.y < 0 || playerHeadPos.y > 1) {
				player.state = PlayerStates.DEAD;
				hasCollided = true;
			}

			// OTHER SNAKE CHECK
			if (!hasCollided && !(player.invincibilityTimer > 0)) {
				for (let otherClientId in this.activeClients) {
					let otherPlayer = this.activeClients[otherClientId].player;
					if (clientId == otherClientId || otherPlayer.state != PlayerStates.ALIVE) continue;

					for (let i = 0; i < otherPlayer.positions.length; i++) {
						const bodyPart = otherPlayer.positions[i];
						if (player.headCollisionCheck(bodyPart)) {
							player.state = PlayerStates.DEAD;
							hasCollided = true;
							break;
						}
					}

					if (hasCollided) break;
				}
			}

			if (hasCollided) {
				this.placeFoodOnDeadPlayersBody(clientId);
				this.log(`[Player Died] ${clientId}`);
			}
		}
	}

	private placeFoodOnDeadPlayersBody(clientId: string) {
		const player = this.activeClients[clientId].player;
		const foodSize = 6;
		this.addSpecificFoodToMap(player.positions, foodSize);
	}

	updateClients(elapsedTime: number) {
		// Aggregate consumed foods / player deaths / leaderboard
		let foodsEaten: string[] = [];
		let deadPlayers: string[] = [];
		let leaderboardChanged = false;
		let newLeaderboard = [];
		for (let clientId in this.activeClients) {
			let player = this.activeClients[clientId].player;
			if (player.state == PlayerStates.DEAD) {
				deadPlayers.push(clientId);
			}

			if (player.eatenFoods.length > 0) {
				foodsEaten = foodsEaten.concat(player.eatenFoods);
			}

			if (player.state == PlayerStates.ALIVE) {
				newLeaderboard.push({ clientId: player.clientId, name: player.name, length: player.length });
			}
		}

		newLeaderboard.sort((a, b) => {
			return b.length - a.length;
		});
		for (let i = 0; i < newLeaderboard.length; i++) {
			const player = newLeaderboard[i];

			if (player.name !== this.leaderBoard.at(i)?.name || this.leaderBoard.length != newLeaderboard.length) {
				leaderboardChanged = true;
				this.leaderBoard = newLeaderboard;
				break;
			}
		}

		// Update clients w/ new events & states
		for (let clientId in this.activeClients) {
			// UPDATE FOOD STATUS
			let client = this.activeClients[clientId];
			if (client.player.eatenFoods.length > 0) {
				client.socket.emit(NetworkIds.PLAYER_SELF_ATE);
			}

			// UPDATE FOOD MAP
			if (foodsEaten.length > 0 || this.foodsAdded.length > 0) {
				client.socket.emit(NetworkIds.UPDATE_FOODMAP, { new: this.foodsAdded, eaten: foodsEaten });
			}

			// UPDATE PLAYER DEATH STATUS
			if (client.player.state == PlayerStates.DEAD && !client.player.reportedAsDead) {
				client.socket.emit(NetworkIds.PLAYER_DEATH_SELF);
				client.player.reportedAsDead = true;

				for (let otherId in this.activeClients) {
					if (otherId !== clientId) {
						this.activeClients[otherId].socket.emit(NetworkIds.PLAYER_DEATH_OTHER, { clientId: clientId });
					}
				}
			}

			// UPDATE LEADERBOARDS
			if (leaderboardChanged) {
				let rank = this.leaderBoard.findIndex((v) => v.clientId == client.player.clientId);
				client.socket.emit(NetworkIds.UPDATE_LEADERBOARD, { rank: rank, top5: this.leaderBoard.slice(0, 5) });
			}

			// UPDATE PLAYER MOVEMENTS
			let update = {
				clientId: clientId,
				lastMessageId: client.lastMessageId,
				directions: client.player.directions,
				positions: client.player.positions,
				speed: client.player.speed,
				length: client.player.length,
				size: client.player.size
			};

			if (client.player.reportUpdate) {
				client.socket.emit(NetworkIds.UPDATE_SELF, update);

				for (let otherId in this.activeClients) {
					if (otherId !== clientId) {
						this.activeClients[otherId].socket.emit(NetworkIds.UPDATE_OTHER, update);
					}
				}
			}
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
						size: newPlayer.size,
						name: newPlayer.name
					});

					socket.emit(NetworkIds.CONNECT_OTHER, {
						clientId: client.player.clientId,
						directions: client.player.directions,
						positions: client.player.positions,
						rotateRate: client.player.rotateRate,
						speed: client.player.speed,
						length: client.player.length,
						size: client.player.size,
						name: client.player.name
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
				foodMap: this.foodMap,
				leaderBoard: this.leaderBoard.slice(0, 5)
			});

			socket.on(NetworkIds.INPUT, (data) => {
				this.inputQueue.enqueue({
					clientId: socket.id,
					message: data
				});
			});

			socket.on(NetworkIds.REQUEST_NAME, (data) => {
				if (data) {
					this.activeClients[socket.id].player.name = data;
				}
				for (let clientId in this.activeClients) {
					this.activeClients[clientId].socket.emit(NetworkIds.UPDATE_NAME, {
						clientId: socket.id,
						name: data
					});
				}
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
		return new Position(Random.nextRandomBetween(0.01, 0.99), Random.nextRandomBetween(0.01, 0.99));
	}

	private initalizeFoodMap() {
		// this.addRandomFoodToMap(this.maximumFood);
	}

	/*
	 * Adds numFood to the food map
	 * @returns Array of all ids added
	 */
	private addRandomFoodToMap(numFood: number) {
		let foodAssetNames: string[] = [];
		let addedFoods: Food[] = [];
		for (let { name } of foodFiles) {
			foodAssetNames.push(name);
		}

		for (let i = 0; i < numFood; i++) {
			let randomName = foodAssetNames[Math.floor(foodAssetNames.length * Math.random())];

			this.foodMap[`${this.foodCounter}`] = new Food(
				`${this.foodCounter}`,
				randomName,
				Random.nextRandomBetween(3, 4),
				new Position(Random.nextRandomBetween(0, 1), Random.nextRandomBetween(0, 1)),
				FoodType.REGULAR
			);
			addedFoods.push(this.foodMap[`${this.foodCounter}`]);

			this.foodCounter++;
		}

		this.foodsAdded = this.foodsAdded.concat(addedFoods);
	}

	/*
	 * Adds numFood to the food map
	 * @param posArr - array of positions to place the foods
	 * @param foodSize - total size of each food
	 * @returns Array of all ids added
	 */
	private addSpecificFoodToMap(posArr: Position[], foodSize: number) {
		let foodAssetNames: string[] = [];
		let addedFoods: Food[] = [];
		for (let { name } of foodFiles) {
			foodAssetNames.push(name);
		}
		let randomName = foodAssetNames[Math.floor(foodAssetNames.length * Math.random())];

		for (let i = 0; i < posArr.length; i++) {
			this.foodMap[`${this.foodCounter}`] = new Food(
				`${this.foodCounter}`,
				randomName,
				foodSize,
				new Position(posArr[i].x, posArr[i].y),
				FoodType.REGULAR
			);
			addedFoods.push(this.foodMap[`${this.foodCounter}`]);

			this.foodCounter++;
		}

		this.foodsAdded = this.foodsAdded.concat(addedFoods);
	}

	private log(...s: string[]) {
		console.log(`\x1b[0;31m[WSS]\x1b[0m ${s}`);
	}
}
