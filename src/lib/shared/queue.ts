export class Queue<T> {
	private data: T[];

	constructor() {
		this.data = [];
	}

	enqueue(value: T): void {
		this.data.push(value);
	}

	dequeue(): T | undefined {
		return this.data.shift();
	}

	get front(): T | undefined {
		return this.data[0];
	}

	get empty(): boolean {
		return this.data.length === 0;
	}
}
