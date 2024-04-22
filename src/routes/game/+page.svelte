<script lang="ts">
	import { browser } from '$app/environment';
	import { Game, GameStatusEnum } from '$lib/client/game';
	import { MusicManager, type Music } from '$lib/client/music';
	import InputManager from '$lib/inputManager';
	import { onDestroy, onMount, tick } from 'svelte';
	import { blur } from 'svelte/transition';

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

	let biteFoodSound: HTMLAudioElement;
	let backgroundMusic: HTMLAudioElement;

	let highScores: { name: string; score: number }[] = [];

	// Grab the stored scores
	if (browser) {
		const storedHighScores: any = localStorage.getItem('slyther.io.highScores');
		if (storedHighScores) {
			highScores = JSON.parse(storedHighScores);
		}
	}

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

			if (game.gameState != GameStatusEnum.Idle) {
				requestAnimationFrame(gameLoop);
			}
		}

		let musicManager = MusicManager.getInstance();
		musicManager.loadMusic('biteSound', 'assets/sounds/biteFood.mp3');
		musicManager.loadMusic('playerDeathSound', 'assets/sounds/popSound.mp3');
		musicManager.loadMusic('backgroundMusic', 'assets/sounds/backgroundMusic.mp3').then((res) => {
			musicManager.playMusic('backgroundMusic', true, 0.5);
		});

		game.initalizeGame(canvas, inputManager);
		gameLoop(performance.now());

		if (false) {
			canvas.requestFullscreen().catch((err) => {
				console.warn('Failed setting fullscreen', err);
			});
		}
	});

	onDestroy(() => {
		game.exit();
	});

	function updateHighScores(justGoHome: boolean = false) {
		if (!justGoHome) {
			highScores.push({ name: 'joe', score: game.playerScore });
			highScores.sort((a, b) => b.score - a.score);

			localStorage.setItem('slyther.io.highScores', JSON.stringify(highScores));
		}
	}
</script>

<svelte:window
	on:keydown={keyPressHandler}
	on:keyup={keyReleaseHandler}
	on:mousemove={mouseMoveHandler}
	on:mouseup={mouseUpHandler}
/>

{#if show}
	<div class="mainWrapper" bind:clientWidth={canvasWidth} bind:clientHeight={canvasHeight}>
		<div class="scoreCard displayText">
			<h1 style="margin:0;">{game.playerScore}</h1>
		</div>

		<div class="lowerLeft displayText">
			<p style="margin: 0;">Lag: {game.inputLatency}ms</p>
		</div>

		<!-- Leaderboard -->
		<div class="leaderBoard">
			<h3 class="displayText" style="margin: 0;">Leaderboard</h3>
			<hr style="width: 100%" />
			<ol style="margin: 0;">
				<li class="displayText">Zack</li>
				<li class="displayText">Joe</li>
				<li class="displayText">Tommy</li>
				<li class="displayText">Tim</li>
				<li class="displayText">RomanConquerer</li>
			</ol>
		</div>

		<!-- Lose Panel -->
		{#if game.gameState == GameStatusEnum.Lost}
			<div class="displayPane" in:blur={{ amount: 10, duration: 1500 }}>
				<div class="losepane">
					<h1>You Zigged, but shoulda Zagged!</h1>
					<h3>Good Try</h3>
					<p>Score: {game.playerScore}</p>
					<button class="menuButton" on:click={() => updateHighScores()}>Submit Score</button>
					<a class="menuButton" on:click={() => updateHighScores(true)} href="/">Main Menu</a>
				</div>
			</div>
		{/if}

		<!-- Game Canvas -->
		<canvas id="renderCanvas" bind:this={canvas}> </canvas>
	</div>

	<audio id="biteFoodSound" bind:this={biteFoodSound}>
		<source src="" type="audio/mpeg" />
		Your browser does not support the audio element.
	</audio>
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
		border-radius: 0.5rem;
		z-index: 100;
	}

	.scoreCard {
		position: absolute;
		display: flex;
		flex-direction: row;
		left: 45%;
		right: 45%;
		top: 0.5rem;
		background: rgb(00, 00, 00, 0.3);
		padding: 0.5rem;
		border-radius: 0.5rem;
		justify-content: center;
		flex-wrap: nowrap;
		align-content: center;
		align-items: center;
		z-index: 100;
	}

	.leaderBoard {
		position: absolute;
		display: flex;
		flex-direction: column;
		top: 0.5rem;
		right: 0.5rem;
		background: rgb(00, 00, 00, 0.3);
		padding: 0.5rem;
		border-radius: 0.5rem;
		align-content: space-around;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-start;
		z-index: 100;
	}

	.losepane {
		color: var(--c1);
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		align-content: center;
		align-items: center;
		justify-content: flex-start;
		background: rgb(00, 00, 00, 0.6);
		padding: 0.5rem;
		border-radius: 0.5rem;
		box-shadow: 14px 10px 5px rgba(0, 0, 0, 0.4);
	}

	.menuButton {
		background-color: #f4511e;
		border: none;
		color: white;
		padding: 16px 32px;
		text-align: center;
		font-size: 16px;
		margin: 4px 2px;
		opacity: 0.85;
		color: var(--c3);
		transition: 0.5s;
		display: inline-block;
		text-decoration: none;
		cursor: pointer;
		border-radius: 2rem;
		font-weight: bold;
	}

	.menuButton:hover {
		opacity: 1;
		box-shadow: 14px 10px 5px rgba(0, 0, 0, 0.4);
	}

	.displayText {
		color: white;
		text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.9);
	}

	.displayPane {
		backdrop-filter: blur(2px) brightness(0.75);
		position: absolute;
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		align-content: center;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}
</style>
