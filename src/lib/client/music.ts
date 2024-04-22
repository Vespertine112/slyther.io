export type Music = {
	biteFoodSound: HTMLAudioElement;
};

// Singleton MusicManager
export class MusicManager {
	private static instance: MusicManager | null = null;
	musicSet: Set<HTMLAudioElement> = new Set<HTMLAudioElement>();
	private fadeOutIntervals: Map<HTMLAudioElement, number | undefined> = new Map();
	private fadeOutSet: Set<HTMLAudioElement> = new Set<HTMLAudioElement>();

	private constructor() {}
	static getInstance(): MusicManager {
		if (!MusicManager.instance) {
			MusicManager.instance = new MusicManager();
		}
		return MusicManager.instance;
	}

	addMusic(music: Music) {
		Object.values(music).forEach((sound: HTMLAudioElement) => {
			if (sound instanceof HTMLAudioElement) {
				this.musicSet.add(sound);
			} else {
				console.error('Invalid audio element:', sound);
			}
		});
	}

	fadeOutMusic(audioElement: HTMLAudioElement, duration: number, volume: number) {
		// Check if the audioElement is managed and currently playing
		if (this.musicSet.has(audioElement) && this.fadeOutSet.has(audioElement)) {
			// Reset volume to original value
			audioElement.volume = volume;
			// Clear existing fade-out interval
			const fadeOutInterval = this.fadeOutIntervals.get(audioElement);
			if (fadeOutInterval) {
				clearInterval(fadeOutInterval);
			}
		}

		this.fadeOutSet.add(audioElement);
		const initialVolume = audioElement.volume;
		const steps = Math.ceil(duration / 50);
		const stepVolume = initialVolume / steps;

		const fadeOutInterval = setInterval(() => {
			if (audioElement.volume - stepVolume <= 0) {
				audioElement.pause();
				audioElement.currentTime = 0;
				audioElement.volume = volume; // Reset volume to original value

				clearInterval(fadeOutInterval);
				this.fadeOutIntervals.delete(audioElement);
				this.fadeOutSet.delete(audioElement);
			} else {
				audioElement.volume -= stepVolume;
			}
		}, 50);

		// Store fade-out interval reference
		this.fadeOutIntervals.set(audioElement, fadeOutInterval);
	}
}
