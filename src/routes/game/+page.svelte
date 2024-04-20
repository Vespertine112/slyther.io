<script lang="ts">
	import { Game } from '$lib/client/game';
	import InputManager from '$lib/inputManager';
	import { onDestroy, onMount, tick } from 'svelte';

	$: canvasWidth = 100;
	$: canvasHeight = 100;
	$: show = false;
	$: frameCounter = 0;
	let canvas: HTMLCanvasElement;
	let lastTimestamp = performance.now();

	let game: Game = new Game();
	let inputManager: InputManager = new InputManager();
	const keyPressHandler = inputManager.keyPress.bind(inputManager);
	const keyReleaseHandler = inputManager.keyRelease.bind(inputManager);
	const mouseMoveHandler = inputManager.mouseMove.bind(inputManager);
	const mouseUpHandler = inputManager.mouseUp.bind(inputManager);

	onMount(async () => {
		show = true;
		await tick();

		function gameLoop(time: number) {
			const elapsedTime = time - lastTimestamp;
			lastTimestamp = time;

			// Needed for fully-reactive canvas
			if (canvas) {
				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
			}

			game.processInput(elapsedTime);

			game.update(elapsedTime);

			game.render();

			frameCounter += 1;

			game = game;

			requestAnimationFrame(gameLoop);
		}

		game.initalizeGame(canvas, inputManager);
		gameLoop(performance.now());
	});

	onDestroy(() => {
		game.exit();
	});
</script>

<svelte:window
	on:keydown={keyPressHandler}
	on:keyup={keyReleaseHandler}
	on:mousemove={mouseMoveHandler}
	on:mouseup={mouseUpHandler}
/>

{#if show}
	<div class="mainWrapper" bind:clientWidth={canvasWidth} bind:clientHeight={canvasHeight}>
		<canvas id="renderCanvas" bind:this={canvas}> </canvas>
		<div class="lowerLeft">
			<p style="margin: 0;">Lag: {game.inputLatency}ms</p>
		</div>
	</div>
{/if}

<style>
	.mainWrapper {
		display: flex;
		flex-direction: row;
		justify-content: center;
		width: 100%;
		height: 100vh;
	}

	#renderCanvas {
		max-width: 100%;
		max-height: 100%;
	}

	.lowerLeft {
		position: absolute;
		display: flex;
		flex-direction: row;
		left: 0.5rem;
		bottom: 0.5rem;
		background: rgb(00, 00, 00, 0.3);
		padding: 0.5rem;
		border-radius: 1rem;
	}
</style>
