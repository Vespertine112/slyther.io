import { browser } from '$app/environment';

export type Music = {
	biteFoodSound: HTMLAudioElement;
	backgroundMusic: HTMLAudioElement;
};

// Singleton MusicManager
export class MusicManager {
	private static instance: MusicManager | null = null;
	private audioContext: AudioContext;
	private audioBuffers: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();
	private sourceNodes: Map<string, AudioBufferSourceNode> = new Map<string, AudioBufferSourceNode>();

	private constructor() {
		if (browser) {
			this.audioContext = new AudioContext();
		}
	}

	static getInstance(): MusicManager {
		if (!MusicManager.instance) {
			MusicManager.instance = new MusicManager();
		}
		return MusicManager.instance;
	}

	async loadMusic(name: string, url: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fetch(url)
				.then((response) => response.arrayBuffer())
				.then((audioData) => this.audioContext.decodeAudioData(audioData))
				.then((audioBuffer) => {
					this.audioBuffers.set(name, audioBuffer);
					resolve();
				})
				.catch((error) => {
					console.error('Failed to load music:', error);
					reject(error);
				});
		});
	}

	playMusic(name: string, loop: boolean = false, volume: number = 1): void {
		// Stop any currently playing music with the same name
		this.stopMusic(name);

		const audioBuffer = this.audioBuffers.get(name);
		if (audioBuffer) {
			const sourceNode = this.audioContext.createBufferSource();
			sourceNode.buffer = audioBuffer;
			sourceNode.loop = loop;

			// Create a gain node to control the volume
			const gainNode = this.audioContext.createGain();
			gainNode.gain.value = volume;

			// Connect nodes: source -> gain -> destination
			sourceNode.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			sourceNode.start();
			this.sourceNodes.set(name, sourceNode);
		}
	}

	playSound(name: string, loop: boolean = false, volume: number = 1): void {
		const audioBuffer = this.audioBuffers.get(name);
		if (audioBuffer) {
			const sourceNode = this.audioContext.createBufferSource();
			sourceNode.buffer = audioBuffer;
			sourceNode.loop = loop;

			// Create a gain node to control the volume
			const gainNode = this.audioContext.createGain();
			gainNode.gain.value = volume;

			// Connect nodes: source -> gain -> destination
			sourceNode.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			sourceNode.start();
			this.sourceNodes.set(name, sourceNode);
		}
	}

	stopMusic(name: string): void {
		const sourceNode = this.sourceNodes.get(name);
		if (sourceNode) {
			sourceNode.stop();
			this.sourceNodes.delete(name);
		}
	}
}
