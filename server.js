import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';
import { GameServer } from './src/lib/server/gameServer';

const port = 3000;
const app = express();
const server = createServer(app);

const io = new Server(server);
const game = new GameServer();

app.use(handler);

game.initalizeGame(io);
server.listen(port);
