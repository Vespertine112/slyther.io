import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { webSocketServer } from './webSocketServer.ts';

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
