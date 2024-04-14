// Generic Helper Functions

export function getRandomInt(max: number) {
	return Math.floor(Math.random() * max);
}

export type Music = {};

// Fades out music. Then resets the time & volume
export function fadeOutMusic(audioElement: HTMLAudioElement, duration: number, volume: number) {
	var volume = audioElement.volume;
	var initalVolume = volume;
	var intervalTime = 50;
	var steps = duration / intervalTime;
	var stepVolume = volume / steps;

	var fadeOutInterval = setInterval(function () {
		volume -= stepVolume;
		if (volume < 0) {
			audioElement.pause();
			audioElement.currentTime = 0;
			volume = initalVolume;
			clearInterval(fadeOutInterval);
		}
		audioElement.volume = volume;
	}, intervalTime);
}
