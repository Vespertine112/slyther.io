import { Vector } from './gameTypes';

export const Random = {
	nextCircleVector: (): Vector => {
		let angle = Math.random() * 2 * Math.PI;
		return new Vector(Math.cos(angle), Math.sin(angle));
	},
	/**
	 * Generates gaussian between (0,1)
	 */
	nextGaussian: (mean: number = 0, stddev: number = 1): number => {
		let u = 0,
			v = 0;
		while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
		while (v === 0) v = Math.random();
		const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		return mean + z * stddev;
	},
	nextRandomBetween(min: number, max: number) {
		if (min > max) {
			[min, max] = [max, min];
		}

		return Math.random() * (max - min) + min;
	},
	getRandomFireColor(): string {
		const red = Random.nextRandomBetween(200, 256);
		const green = Random.nextRandomBetween(0, 200);
		const blue = Random.nextRandomBetween(0, 60);

		// Construct the color string in RGBA format
		const color = `rgba(${red}, ${green}, ${blue}, 1)`;

		return color;
	},
	generateRandomRanges(totalPoints: number, rangeLength: number, numberOfRanges: number): number[][] {
		let startingPoints: number[] = [];
		while (startingPoints.length < numberOfRanges) {
			let randomStart = Math.floor(Math.random() * (totalPoints - rangeLength + 1));
			if (!startingPoints.some((point) => Math.abs(point - randomStart) < rangeLength)) {
				startingPoints.push(randomStart);
			}
		}

		startingPoints.sort((a, b) => a - b);
		let ranges: number[][] = [];
		for (let i = 0; i < numberOfRanges; i++) {
			let start = startingPoints[i];
			let end = start + rangeLength - 1;
			ranges.push([start, end]);
		}

		return ranges;
	},
	getRandomInt(max: number) {
		return Math.floor(Math.random() * max);
	}
};
