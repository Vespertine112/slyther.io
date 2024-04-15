import { Server } from 'socket.io';
import { type ViteDevServer } from 'vite';
import { Game } from './src/lib/server/game';

/**
 * This gets injected as a vite plugin, but all processing is handed off to the internal game server.
 */

export const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return;

		const io = new Server(server.httpServer);

		const game = new Game();
	}
};
