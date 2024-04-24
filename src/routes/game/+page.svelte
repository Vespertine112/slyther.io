<script lang="ts">
	import { browser } from '$app/environment';
	import { Game, GameStatusEnum } from '$lib/client/game';
	import { MusicManager } from '$lib/client/music';
	import InputManager from '$lib/inputManager';
	import { Random } from '$lib/shared/random';
	import { onDestroy, onMount, tick } from 'svelte';
	import { blur } from 'svelte/transition';

	$: canvasWidth = 100;
	$: canvasHeight = 100;
	$: show = false;
	let canvas: HTMLCanvasElement;
	let lastTimestamp = performance.now();
	let highScores: { name: string; score: number }[] = [];
	let playerName: string | null;

	$: frameCounter = 0;
	$: fps = 0;
	$: frameTimer = 0;

	$: if (frameTimer > 1000) {
		fps = frameCounter;
		frameCounter = 0;
		frameTimer = 0;
	}

	// Grab the stored scores
	if (browser) {
		const storedHighScores: any = localStorage.getItem('slyther.io.highScores');
		if (storedHighScores) {
			highScores = JSON.parse(storedHighScores);
		}
	}

	// Grab stored playername
	// Note if it is undefined, that's expected and the server will assign a name!
	if (browser) {
		playerName = localStorage.getItem('slyther.io.playerName');
	}

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

			frameCounter++;
			frameTimer += elapsedTime;

			game = game;

			if (game.gameState != GameStatusEnum.Idle) {
				requestAnimationFrame(gameLoop);
			}
		}

		let musicManager = MusicManager.getInstance();
		musicManager.loadMusic('biteSound', 'assets/sounds/biteFood.mp3');
		musicManager.loadMusic('playerDeathSound', 'assets/sounds/popSound.mp3');
		musicManager.loadMusic('clickSound', 'assets/sounds/click.mp3');
		musicManager.loadMusic('boostSound', 'assets/sounds/boost.mp3');
		musicManager.loadMusic('backgroundMusic', 'assets/sounds/backgroundMusic.mp3').then((res) => {
			musicManager.playMusic('backgroundMusic', true, 0.5, 5);
		});

		game.initalizeGame(canvas, inputManager, playerName);
		gameLoop(performance.now());
	});

	onDestroy(() => {
		game.exit();
	});

	function updateHighScores(justGoHome: boolean = false) {
		if (!justGoHome && game.playerScore > 0) {
			highScores.push({ name: playerName || 'Unknown', score: game.playerScore });
			highScores.sort((a, b) => b.score - a.score);

			localStorage.setItem('slyther.io.highScores', JSON.stringify(highScores));
			game.exit();
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
			<p style="margin: 0;">Input Lag: {game.inputLatency}ms</p>
		</div>

		<div class="topLeft displayText">
			<p style="margin: 0;">FPS: {fps}</p>
		</div>

		<div class="lowerRight displayText">
			<p style="margin: 0;">Rank: {game.playerRank + 1}</p>
		</div>

		<!-- Leaderboard -->
		<div class="leaderBoard">
			<h3 class="displayText" style="margin: 0;">Leaderboard</h3>
			<hr style="width: 100%" />
			<ol style="margin: 0;">
				{#each game.leaderBoard as leader}
					<li class="displayText"><span class="truncate">{leader.name}</span></li>
				{/each}
			</ol>
		</div>

		<!-- Lose Panel -->
		{#if game.gameState == GameStatusEnum.Lost}
			<div class="displayPane" in:blur={{ amount: 10, duration: 1500 }}>
				<div class="losepane">
					<h1>You Zigged, but shoulda Zagged!</h1>
					<hr style="width: 100%;" />
					<div style="display: flex; flex-direction: row; width: 100%; justify-content: center;">
						<h3 style="margin-right: 1rem;">Score: {game.playerScore}</h3>
						<h3 style="margin-left: 1rem;">Highest Rank: {game.playerBestRank}</h3>
					</div>

					<div class="controlButtons">
						<a
							class="menuButton shadow"
							on:click={() => {
								MusicManager.getInstance().playSound('clickSound', false, 0.75);
								return updateHighScores();
							}}
							href="/">Submit Score</a
						>
						<a
							class="menuButton shadow"
							on:click={() => MusicManager.getInstance().playSound('clickSound', false, 0.75)}
							href="/">Main Menu</a
						>
					</div>
				</div>
			</div>
		{/if}

		<!-- Game Canvas -->
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

	.lowerLeft {
		position: absolute;
		display: flex;
		flex-direction: row;
		left: 0.5rem;
		bottom: 0.5rem;
		background: rgb(00, 00, 00, 0.5);
		padding: 0.5rem;
		border-radius: 0.5rem;
		z-index: 100;
	}

	.topLeft {
		position: absolute;
		display: flex;
		flex-direction: row;
		left: 0.5rem;
		top: 0.5rem;
		background: rgb(00, 00, 00, 0.5);
		padding: 0.5rem;
		border-radius: 0.5rem;
		z-index: 100;
	}

	.lowerRight {
		position: absolute;
		display: flex;
		flex-direction: row;
		right: 0.5rem;
		bottom: 0.5rem;
		background: rgb(00, 00, 00, 0.5);
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
		background: rgb(00, 00, 00, 0.5);
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
		background: rgb(00, 00, 00, 0.5);
		padding: 0.5rem;
		border-radius: 0.5rem;
		align-content: space-around;
		justify-content: flex-start;
		z-index: 100;
		max-width: 15%;
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
		padding: 2rem;
		border-radius: 0.5rem;
		box-shadow: 14px 10px 5px rgba(0, 0, 0, 0.4);
	}

	.menuButton {
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
		background-color: var(--c2);
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

	.controlButtons {
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
		align-content: center;
		flex-wrap: nowrap;
		margin: 1rem 0 0 0;
		min-width: 80%;
	}
</style>
