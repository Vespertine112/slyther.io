// Generic Helper Functions
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

export const foodFiles = [
	{ fileName: 'Bacon_food.png', name: 'Bacon' },
	{ fileName: 'Cheese_food.png', name: 'Cheese' },
	{ fileName: 'Jam_food.png', name: 'Jam' },
	{ fileName: 'Mango_food.png', name: 'Mango' },
	{ fileName: 'Pie_food.png', name: 'Pie' },
	{ fileName: 'Prawn_food.png', name: 'Prawn' },
	{ fileName: 'Seaweed_Sushi_food.png', name: 'Seaweed Sushi' },
	{ fileName: 'Strawberry_food.png', name: 'Strawberry' },
	{ fileName: 'Sushi_food.png', name: 'Sushi' },
	{ fileName: 'Pineapple_food.png', name: 'Pineapple' },
	{ fileName: 'Egg_food.png', name: 'Egg' },
	{ fileName: 'Bread_food.png', name: 'Bread' },
	{ fileName: 'Watermelon_food.png', name: 'Watermelon' },
	{ fileName: 'Chicken_Leg_food.png', name: 'Chicken_Leg' },
	{ fileName: 'Salmon_food.png', name: 'Salmon' }
];
