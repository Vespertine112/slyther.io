import type { GameStateEnum } from "./stateMachine";

/*
 State Interface, represents a given state of the game 
*/
export interface State {
    // Enters the state. Perform all loading & initalization here
    enter(): void;

    processInput(elapsedTime: number): GameStateEnum;

    update(elapsedTime: number): void;

    render(elapsedTime: number): void;

    exit(): void;
}
