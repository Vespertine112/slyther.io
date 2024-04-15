<script lang="ts">
	import { Game } from '$lib/client/game';
	import { onMount, tick } from 'svelte';

	$: canvasWidth = 100;
	$: canvasHeight = 100;
	$: show = false;
	$: frameCounter = 0;
	let canvas: HTMLCanvasElement;
	let lastTimestamp = performance.now();

	let game: Game = new Game();

	onMount(async () => {
		show = true;
		await tick();

		function update(elapsedTime: number) {
			// Needed for fully-reactive canvas
			if (canvas) {
				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
			}
		}

		function gameLoop(time: number) {
			const elapsedTime = time - lastTimestamp;
			lastTimestamp = time;

			update(elapsedTime);

			// render(elapsedTime);

			// frameCounter += 1;

			requestAnimationFrame(gameLoop);
		}

		game.initalizeGame(canvas);
		gameLoop(performance.now());
	});
</script>

{#if show}
	<div class="mainWrapper" bind:clientWidth={canvasWidth} bind:clientHeight={canvasHeight}>
		<canvas id="renderCanvas" bind:this={canvas}> </canvas>
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
</style>
