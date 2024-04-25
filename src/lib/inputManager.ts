import { browser } from '$app/environment';

export enum CustomCommands {
	MoveForward = 'MoveForward',
	Boost = 'Boost',
	RotateRight = 'RotateLeft',
	RotateLeft = 'RotateRight',
	TurnUp = 'TurnUp',
	TurnDown = 'TurnDown',
	TurnRight = 'TurnRight',
	TurnLeft = 'TurnLeft',
	MouseMove = 'MouseMove',
	UpRight = 'UpRight',
	DownRight = 'DownRight',
	UpLeft = 'UpLeft',
	DownLeft = 'DownLeft'
}

type handlerCallback = (t: any) => any;

/**
 * Input Manager: Registers all callbacks to handle input
 */
export default class InputManager {
	mousePosition: { x: number; y: number } = { x: 0, y: 0 };
	private activelyMappingCommandFlag = false;
	private activelyMappingCommandEnum!: CustomCommands;
	/**
	 * Customizable game commands
	 */
	private customGameCommands: { label: string; keyCode: string; command: CustomCommands }[] = [
		{ label: 'Boost', keyCode: 'Space Bar', command: CustomCommands.Boost },
		{ label: 'Rotate Right', keyCode: 'd', command: CustomCommands.RotateRight },
		{ label: 'Rotate Left', keyCode: 'a', command: CustomCommands.RotateLeft },
		{ label: 'Mouse', keyCode: 'Mouse Move', command: CustomCommands.MouseMove },
		{ label: 'Turn Up', keyCode: 'ArrowUp', command: CustomCommands.TurnUp },
		{ label: 'Turn Down', keyCode: 'ArrowDown', command: CustomCommands.TurnDown },
		{ label: 'Turn Right', keyCode: 'ArrowRight', command: CustomCommands.TurnRight },
		{ label: 'Turn Left', keyCode: 'ArrowLeft', command: CustomCommands.TurnLeft }
	];
	private customGameCommandCombos: {
		label: string;
		keyCode: string;
		command: CustomCommands;
		matchCommands: CustomCommands[];
	}[] = [
		{
			label: 'Turn UpRight',
			keyCode: 'UpRight',
			command: CustomCommands.UpRight,
			matchCommands: [CustomCommands.TurnUp, CustomCommands.TurnRight]
		},
		{
			label: 'Turn DownRight',
			keyCode: 'DownRight',
			command: CustomCommands.DownRight,
			matchCommands: [CustomCommands.TurnDown, CustomCommands.TurnRight]
		},
		{
			label: 'Turn UpLeft',
			keyCode: 'UpLeft',
			command: CustomCommands.UpLeft,
			matchCommands: [CustomCommands.TurnUp, CustomCommands.TurnLeft]
		},
		{
			label: 'Turn DownLeft',
			keyCode: 'DownLeft',
			command: CustomCommands.DownLeft,
			matchCommands: [CustomCommands.TurnDown, CustomCommands.TurnLeft]
		}
	];
	private customMappingCallback: undefined | (() => void);

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
				if (!this.handlers[key].options.hasFired && this.handlers[key]) {
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

			if (this.customMappingCallback) {
				this.customMappingCallback();
			}
		}

		let key = this.resolveKey(event.key);
		this.activeKeys[key] = true;

		// Activate Combos
		this.activateCombos();
	}

	keyRelease(event: KeyboardEvent) {
		let keyCode = this.resolveKey(event.key);
		this.deactivateCombos(keyCode);

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
		this.activeKeys['MouseUp'] = true;
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

	listenForCustomCommandMap(newCommand: CustomCommands, callback: () => void) {
		this.activelyMappingCommandFlag = true;
		this.activelyMappingCommandEnum = newCommand;
		this.customMappingCallback = callback;
	}

	private mapCustomCommand(keyCode: string, newCommand: CustomCommands) {
		this.customGameCommands.map((custCommand) => {
			if (custCommand.command === newCommand && newCommand !== CustomCommands.MouseMove) {
				custCommand.keyCode = keyCode;
			}
		});
	}

	/**
	 * Matches keys against custom codes, combos, or no-op
	 */
	private resolveKey(keyCode: string): string {
		let returnCode = keyCode;

		if (keyCode === ' ') {
			const boostIndex = this.customGameCommands.findIndex((a) => a.command === CustomCommands.Boost);
			if (boostIndex !== -1) {
				returnCode = this.customGameCommands[boostIndex].command;
			}
		}

		for (let idx = 0; idx < this.customGameCommands.length; idx++) {
			const command = this.customGameCommands[idx];
			if (command.keyCode === keyCode) {
				returnCode = command.command;
			}
		}

		return returnCode;
	}

	private activateCombos() {
		for (let i = 0; i < this.customGameCommandCombos.length; i++) {
			const combo = this.customGameCommandCombos[i];
			const matchCommands = combo.matchCommands.filter((command) => this.activeKeys[command]);

			if (matchCommands.length === combo.matchCommands.length) {
				// All constituent commands of the combo are active, deactivate them
				combo.matchCommands.forEach((command) => {
					this.activeKeys[command] = false;
				});
				this.activeKeys[combo.command] = true;
				break; // Found a matching combo, no need to continue searching
			}
		}
	}

	/**
	 * Deactivates combos
	 * @param keyCode - the released key which will potentially break a combo
	 * NOTE!: To allow nkro, the other keys in the combo command will fire
	 */
	private deactivateCombos(keyCode: string) {
		for (let i = 0; i < this.customGameCommandCombos.length; i++) {
			const combo = this.customGameCommandCombos[i];
			const matchCommands = combo.matchCommands.filter((command) => this.activeKeys[command] == false);

			if (matchCommands.length === combo.matchCommands.length) {
				combo.matchCommands.forEach((command) => {
					if (this.activeKeys.hasOwnProperty(command) && command == keyCode) {
						delete this.activeKeys[command];
					} else {
						this.activeKeys[command] = true;
						this.handlers[command].options.hasFired = false;
					}
				});

				this.handlers[combo.command].options.hasFired = false;
				this.handlers[combo.command].fireTimeTracker = 0;
				this.handlers[combo.command].release?.(undefined);

				delete this.activeKeys[combo.command];
				break; // Found a matching combo, no need to continue searching
			}
		}
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
	saveCustomCommands() {
		if (!browser) return;
		localStorage.setItem('slyther.io.customCommands', JSON.stringify(this.customGameCommands));
	}

	get gameCommands() {
		return this.customGameCommands;
	}
}
