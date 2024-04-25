import { browser } from '$app/environment';

export type Music = {
	biteFoodSound: HTMLAudioElement;
	backgroundMusic: HTMLAudioElement;
};

// Singleton MusicManager
export class MusicManager {
	private static instance: MusicManager | null = null;
	private audioContext!: AudioContext;
	private audioBuffers: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();
	private sourceNodes: Map<string, AudioBufferSourceNode> = new Map<string, AudioBufferSourceNode>();
	private playingMusic!: string;

	private soundSetting = true;

	private constructor() {
		if (browser) {
			this.audioContext = new AudioContext();
			this.soundSetting = JSON.parse(localStorage.getItem('slyther.io.settings') ?? '').sound ?? true;
		}
	}

	static getInstance(): MusicManager {
		if (!MusicManager.instance) {
			MusicManager.instance = new MusicManager();
		}
		return MusicManager.instance;
	}

	async loadMusic(name: string, url: string): Promise<void> {
		if (this.audioBuffers.get(name)) {
			return Promise.resolve();
		}

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

	playMusic(name: string, loop: boolean = false, volume: number = 1, fadeDuration: number = 0): void {
		if (!this.soundSetting) return;

		// Stop any currently playing music
		this.stopMusic(5);

		const audioBuffer = this.audioBuffers.get(name);
		if (audioBuffer) {
			const sourceNode = this.audioContext.createBufferSource();
			sourceNode.buffer = audioBuffer;
			sourceNode.loop = loop;

			const gainNode = this.audioContext.createGain();
			gainNode.gain.value = 0;

			sourceNode.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + fadeDuration);

			sourceNode.start();
			this.sourceNodes.set(name, sourceNode);
		}

		this.playingMusic = name;
	}

	playSound(name: string, loop: boolean = false, volume: number = 1): void {
		if (!this.soundSetting) return;

		const audioBuffer = this.audioBuffers.get(name);
		if (audioBuffer) {
			const sourceNode = this.audioContext.createBufferSource();
			sourceNode.buffer = audioBuffer;
			sourceNode.loop = loop;

			const gainNode = this.audioContext.createGain();
			gainNode.gain.value = volume;

			sourceNode.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			sourceNode.start();
			this.sourceNodes.set(name, sourceNode);
		}
	}

	stopMusic(fadeDuration: number = 1): void {
		if (!this.playingMusic) return;

		const sourceNode = this.sourceNodes.get(this.playingMusic);
		if (sourceNode) {
			sourceNode.stop();
		}
	}

	updateSettings() {
		this.soundSetting = JSON.parse(localStorage.getItem('slyther.io.settings') ?? '').sound ?? true;
		if (!this.soundSetting) {
			this.stopEverything();
		}
	}

	private stopEverything() {
		this.sourceNodes.forEach((node) => {
			node.stop();
		});
	}
}
