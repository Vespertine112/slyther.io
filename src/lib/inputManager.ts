import { browser } from '$app/environment';

export enum CustomCommands {
	MoveForward = 'MoveForward',
	Boost = 'Boost',
	TurnLeft = 'TurnLeft',
	TurnRight = 'TurnRight',
	MouseMove = 'MouseMove'
}

type handlerCallback = (t: any) => any;

/**
 * Input Manager: Registers all callbacks to handle input
 */
export default class InputManager {
	mousePosition: { x: number; y: number } = { x: 0, y: 0 };
	private activelyMappingCommandFlag = false;
	private activelyMappingCommandEnum!: CustomCommands;
	private customGameCommands: { label: string; keyCode: string; command: CustomCommands }[] = [
		{ label: 'Boost', keyCode: 'Space Bar', command: CustomCommands.Boost },
		{ label: 'Turn Right', keyCode: 'ArrowRight', command: CustomCommands.TurnRight },
		{ label: 'Turn Left', keyCode: 'ArrowLeft', command: CustomCommands.TurnLeft },
		{ label: 'Mouse', keyCode: 'Mouse Move', command: CustomCommands.MouseMove }
	];

	activeKeys: { [keyEvent: string]: boolean } = {};
	handlers: {
		[keyEvent: string]: {
			fireTimeTracker: number;
			options: {
				fireRate: number;
				fireOnce: boolean;
				hasFired: boolean;
				toggledControl: boolean;
				toggledOn: boolean;
			};
			handler: handlerCallback;
			release?: handlerCallback;
		};
	} = {};

	constructor() {
		this.activeKeys = {};
		this.loadCustomCommands();
	}

	update(elapsedTime: number) {
		for (let key in this.activeKeys) {
			// Resolve custom commnds to their handlers
			if (this.handlers.hasOwnProperty(key)) {
				// Fire imediately the first press
				if (!this.handlers[key].options.hasFired) {
					this.handlers[key].handler(elapsedTime);
					this.handlers[key].options.hasFired = true;

					// Handle toggle states - IF TOGGLE IS SET, IT SKIPS THE ELSE BLOCK
					if (this.handlers[key].options?.toggledControl) {
						this.handlers[key].options.toggledOn = !this.handlers[key].options.toggledOn;
						continue;
					}
				} else {
					// Continue to fire on interval if specified
					if (
						this.handlers[key].fireTimeTracker >= this.handlers[key].options?.fireRate &&
						!this.handlers[key].options.fireOnce
					) {
						this.handlers[key].fireTimeTracker = 0 - elapsedTime;
						this.handlers[key].handler(elapsedTime);
					} else {
						this.handlers[key].fireTimeTracker += elapsedTime;
					}
				}
			}
		}

		delete this.activeKeys[CustomCommands.MouseMove];
	}

	keyPress(event: KeyboardEvent) {
		if (this.activelyMappingCommandFlag) {
			this.mapCustomCommand(event.key, this.activelyMappingCommandEnum);
			this.activelyMappingCommandFlag = false;
		}

		this.activeKeys[this.resolveKey(event.key)] = true;
	}

	keyRelease(event: KeyboardEvent) {
		let keyCode = this.resolveKey(event.key);
		if (this.handlers.hasOwnProperty(keyCode)) {
			if (
				(this.handlers[keyCode].options?.toggledControl && !this.handlers[keyCode].options.toggledOn) ||
				!this.handlers[keyCode].options?.toggledControl
			) {
				delete this.activeKeys[keyCode];
			}
			this.handlers[keyCode].options.hasFired = false;
			this.handlers[keyCode].fireTimeTracker = 0;
			this.handlers[keyCode].release?.(undefined);
		} else {
			delete this.activeKeys[keyCode];
		}
	}

	mouseMove(event: MouseEvent) {
		this.mousePosition = { x: event.x, y: event.y };
		this.activeKeys[CustomCommands.MouseMove] = true;
	}

	mouseUp(event: MouseEvent) {
		// this.activeKeys['MouseUp'] = true;
	}

	registerCommand(
		commandCodes: string[],
		options: { fireRate?: number; fireOnce?: boolean; toggledControl?: boolean },
		handler: handlerCallback,
		release?: handlerCallback
	) {
		commandCodes.forEach((code) => {
			this.handlers[code] = {
				fireTimeTracker: 0,
				handler,
				release,
				options: {
					...options,
					fireRate: options.fireRate || 0,
					fireOnce: options.fireOnce ?? false,
					hasFired: false,
					toggledControl: options.toggledControl ?? false,
					toggledOn: false
				}
			};
		});
	}

	unRegisterCommand(commandCodes: string[]) {
		commandCodes.forEach((code) => {
			delete this.handlers[code];
		});
	}

	getMappedCustomCommands() {
		return this.customGameCommands;
	}

	listenForCustomCommandMap(newCommand: CustomCommands) {
		this.activelyMappingCommandFlag = true;
		this.activelyMappingCommandEnum = newCommand;
	}

	private mapCustomCommand(keyCode: string, newCommand: CustomCommands) {
		this.customGameCommands.map((custCommand) => {
			if (custCommand.command === newCommand) {
				custCommand.keyCode = keyCode;

				this.saveCustomCommands();
			}
		});
	}

	/**
	 * Matches keys against custom codes or no-op
	 */
	private resolveKey(keyCode: string): string {
		if (keyCode == ' ') {
			let i = this.customGameCommands.findIndex((a) => a.command == CustomCommands.Boost);
			return this.customGameCommands[i].command;
		}

		for (let idx = 0; idx < this.customGameCommands.length; idx++) {
			const command = this.customGameCommands[idx];
			if (command.keyCode == keyCode) {
				return command.command;
			}
		}

		return keyCode;
	}

	// Load up custom commands from localStorage
	private loadCustomCommands() {
		if (!browser) return;
		const savedCommands = localStorage.getItem('slyther.io.customCommands');
		if (savedCommands) {
			this.customGameCommands = JSON.parse(savedCommands);
		}
	}

	// Savecustom commands to localStorage
	private saveCustomCommands() {
		if (!browser) return;
		localStorage.setItem('slyther.io.customCommands', JSON.stringify(this.customGameCommands));
	}

	get gameCommands() {
		return this.customGameCommands;
	}
}
