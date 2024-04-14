import type { State } from './state';
import { MainMenuState } from './MainMenuState';
import { PauseMenuState } from './PauseMenuState';
import { PlayingState } from './PlayingState';
import { levels, type Game } from '$lib/client/gameTypes';
import { HighScoresState } from './HighScoresState';
import { LevelSelectState } from './LevelSelectState';
import { CustomControlsState } from './CustomControlsState';
import type InputManager from '$lib/inputManager';
import type { Music } from '$lib/shared/misc';
import { CreditsState } from './CreditsState';

export enum GameStateEnum {
	MainMenuState,
	LevelSelectState,
	PlayingState,
	PauseMenuState,
	CustomControlsState,
	HighScoresState,
	CreditsState
}

/*
 * State Machine: Manages the FSM for all game states
 */
export class StateMachine {
	private currentState!: State;
	private currentStateEnum!: GameStateEnum;
	private states!: { [key in GameStateEnum]: State };
	private ctx!: CanvasRenderingContext2D;
	private inputManager!: InputManager;
	private resettingFlag: boolean = false;

	constructor() {}

	initalize(
		lander: Game,
		canvas: HTMLCanvasElement,
		inputManager: InputManager,
		music: Music,
		highScores: { name: string; score: number }[]
	) {
		this.ctx = canvas.getContext('2d')!;

		this.inputManager = inputManager;

		this.states = {
			[GameStateEnum.MainMenuState]: new MainMenuState(canvas, inputManager, music),
			[GameStateEnum.LevelSelectState]: new LevelSelectState(canvas, inputManager, lander),
			[GameStateEnum.PlayingState]: new PlayingState(lander, canvas, inputManager, music),
			[GameStateEnum.PauseMenuState]: new PauseMenuState(canvas),
			[GameStateEnum.CustomControlsState]: new CustomControlsState(canvas, inputManager),
			[GameStateEnum.HighScoresState]: new HighScoresState(canvas, inputManager, highScores),
			[GameStateEnum.CreditsState]: new CreditsState(canvas, inputManager)
		};

		// lander.initalizeGame(levels[0], canvas);
		this.currentStateEnum = GameStateEnum.MainMenuState;
		this.currentState = this.states[this.currentStateEnum];
		this.currentState.enter();
	}

	update(elapsedTime: number) {
		let nextState: GameStateEnum = this.currentState.processInput(elapsedTime);
		if (this.resettingFlag) {
			nextState = GameStateEnum.MainMenuState;
			this.resettingFlag = false;
		}

		this.currentState.update(elapsedTime);

		if (nextState != this.currentStateEnum) {
			this.currentState.exit();
			this.currentState = this.states[nextState];
			this.currentState.enter();
			this.currentStateEnum = nextState;
		}
	}

	render(elapsedTime: number) {
		this.currentState.render(elapsedTime);
	}

	getCurrentStateEnum(): GameStateEnum {
		return this.currentStateEnum;
	}

	reset() {
		this.resettingFlag = true;
	}
}
