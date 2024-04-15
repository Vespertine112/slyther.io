import { Server } from 'socket.io';
import { type ViteDevServer } from 'vite';
import { GameServer } from './src/lib/server/gameServer';

/**
 * This gets injected as a vite plugin, but all processing is handed off to the internal game server.
 */

export const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return;

		console.log('\033[0;31m[WSS]\033[0m Server Injected');

		const io: Server = new Server(server.httpServer);
		const game = new GameServer();
		
		game.initalizeGame(io);

	}
};
