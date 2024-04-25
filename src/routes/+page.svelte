<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { Renderer } from '$lib/client/renderer';
	import { ClientPlayer } from '$lib/client/clientPlayer';
	import { Position } from '$lib/shared/gameTypes';
	import { MusicManager } from '$lib/client/music';
	import { browser } from '$app/environment';
	import { Game } from '$lib/client/game';
	import InputManager, { CustomCommands } from '$lib/inputManager';
	import Checkbox from 'svelte-checkbox';

	$: canvasWidth = 100;
	$: canvasHeight = 100;
	$: show = false;
	$: state = MenuStates.MainMenu;

	let name = '';
	let zenModeSetting = true;
	let soundSetting = true;
	let highScores: { name: string; score: number }[] = [];
	let canvas: HTMLCanvasElement;
	let inputManager = new InputManager();

	const keyPressHandler = inputManager.keyPress.bind(inputManager);
	const keyReleaseHandler = inputManager.keyRelease.bind(inputManager);

	// Grab the stored scores, name, and settings
	if (browser) {
		const storedHighScores: any = localStorage.getItem('slyther.io.highScores');
		let storedSettings: any = localStorage.getItem('slyther.io.settings');
		name = localStorage.getItem('slyther.io.playerName') || '';
		if (storedHighScores) {
			highScores = JSON.parse(storedHighScores);
		}
		// If we don't have saved settings, load defaults
		if (storedSettings) {
			storedSettings = JSON.parse(storedSettings);
			zenModeSetting = storedSettings.zenMode;
			soundSetting = storedSettings.sound;
		} else {
			localStorage.setItem(
				'slyther.io.settings',
				JSON.stringify({
					sound: true,
					zenMode: true
				})
			);
		}
	}

	// States for font-page menuing. Quick & somewhat dirty
	enum MenuStates {
		MainMenu,
		EnterName,
		Credits,
		Settings,
		HighScores,
		Controls
	}

	let game = new Game();
	game.addRandomFoodToMap(200);
	onMount(async () => {
		show = true;
		await tick();

		let musicManager = MusicManager.getInstance();
		musicManager.loadMusic('biteSound', 'assets/sounds/biteFood.mp3');
		musicManager.loadMusic('playerDeathSound', 'assets/sounds/popSound.mp3');
		musicManager.loadMusic('clickSound', 'assets/sounds/click.mp3');
		musicManager.loadMusic('backgroundMusic', 'assets/sounds/backgroundMusic.mp3');
		musicManager.loadMusic('boostSound', 'assets/sounds/boost.mp3');
		musicManager.loadMusic('menuMusic', 'assets/sounds/milk-shake.mp3').then((res) => {
			musicManager.playMusic('menuMusic', false, 0.25, 5);
		});

		let pl = new ClientPlayer('no', [new Position(0.5, 0.5)], [0], 1, 0, 0, 1 / 100);
		let rend = new Renderer(canvas, pl);

		function gameLoop(time: number) {
			// Needed for fully-reactive canvas
			if (canvas) {
				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
			}

			rend.renderBackgroundTiles();
			for (let id in game.foodMap) {
				rend.renderFood(game.foodMap[id]);
			}

			requestAnimationFrame(gameLoop);
		}

		gameLoop(performance.now());
	});

	onDestroy(() => {
		game.exit();
		show = false;
	});

	function setPlayerName() {
		localStorage.setItem('slyther.io.playerName', name);
	}

	function saveSettings() {
		MusicManager.getInstance().playSound('clickSound', false, 0.75);
		localStorage.setItem(
			'slyther.io.settings',
			JSON.stringify({
				sound: soundSetting,
				zenMode: zenModeSetting
			})
		);
		MusicManager.getInstance().updateSettings();
	}

	function buttonClick(newState: MenuStates) {
		MusicManager.getInstance().playSound('clickSound', false, 0.75);
		state = newState;
	}

	function mapCustomControl(command: CustomCommands) {
		MusicManager.getInstance().playSound('clickSound', false, 0.75);
		inputManager.listenForCustomCommandMap(command, () => {
			inputManager = inputManager;
		});
	}
	function saveControls() {
		MusicManager.getInstance().playSound('clickSound', false, 0.75);
		inputManager.saveCustomCommands();
	}
</script>

<svelte:window on:keydown={keyPressHandler} on:keyup={keyReleaseHandler} />
{#if show}
	<div class="container" bind:clientWidth={canvasWidth} bind:clientHeight={canvasHeight}>
		<div in:fly={{ x: -200, duration: 1000 }} class="topbar shadow">
			<h1 style="margin:0" class="textShadow">Slyther.io</h1>
		</div>

		<!-- Main Menu -->
		{#if state == MenuStates.MainMenu}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.EnterName)}
						>New game</button
					>

					<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.HighScores)}
						>High Scores</button
					>

					<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.Controls)}>Controls</button
					>

					<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.Settings)}>Settings</button
					>

					<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.Credits)}>Credits</button>
				</div>
			</div>
		{/if}

		<!-- Name select -->
		{#if state == MenuStates.EnterName}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<div class="nameInputContainer textShadow">
						<label for="playerNameInput" style="font-size: 1.5rem; margin: 0 0 1rem 0; font-weight: bold;"
							>Enter your name</label
						>
						<input type="text" bind:value={name} id="playerNameInput" />
					</div>
					<div class="controlButtons">
						<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.MainMenu)}>
							Back
						</button>
						<a href="/game" class="menuButton shadow" on:click={setPlayerName}> Next</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tutorial Message -->

		<!-- Joining Spinner -->

		<!-- Controls -->
		{#if state == MenuStates.Controls}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<div class="customControls">
						<table class="textShadow">
							<tr>
								<th>Control</th>
								<th>Input</th>
							</tr>

							{#key inputManager}
								{#each inputManager.gameCommands as command}
									<tr>
										<td>{command.label}</td>
										<td class="control" on:click={() => mapCustomControl(command.command)}>
											{command.keyCode}
										</td>
									</tr>
								{/each}
							{/key}
						</table>
					</div>

					<div style="display: flex; flex-direction: column; align-items: center;">
						<p style="font-size: small;"><i>*Click a control to re-bind*</i></p>
					</div>

					<div class="controlButtons">
						<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.MainMenu)}>
							Back
						</button>

						<button class="menuButton shadow" on:click={saveControls}> Save </button>
					</div>
				</div>
			</div>
		{/if}

		<!-- High Scores -->
		{#if state == MenuStates.HighScores}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<div class="scores">
						{#each highScores as score}
							<h3 class="textShadow">
								{score.name.slice(0, 9) + (score.name.length > 10 ? '...' : '')} - {score.score}
							</h3>
						{/each}
					</div>

					<div class="controlButtons">
						<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.MainMenu)}>
							Back
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Settings -->
		{#if state == MenuStates.Settings}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<div class="customControls">
						<table class="textShadow">
							<tr>
								<td> Zen-Mode </td>
								<td>
									<Checkbox
										bind:checked={zenModeSetting}
										size="2rem"
										primaryColor="var(--c4)"
										secondaryColor="var(--c1)"
									/>
								</td>
							</tr>

							<p style="font-size: small;"><i>*Full-Screen*</i></p>
							<tr>
								<td> Sound </td>
								<td>
									<Checkbox
										bind:checked={soundSetting}
										size="2rem"
										primaryColor="var(--c4)"
										secondaryColor="var(--c1)"
									/>
								</td>
							</tr>
						</table>
					</div>

					<div class="controlButtons">
						<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.MainMenu)}>
							Back
						</button>

						<button class="menuButton shadow" on:click={saveSettings}> Save </button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Credits -->
		{#if state == MenuStates.Credits}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<table class="textShadow">
						<thead>
							<tr>
								<th>Description</th>
								<th>Source</th>
							</tr>
						</thead>
						<tbody>
							<!-- Table rows -->
							<tr>
								<td>Lead Programmer</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead Designer</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead QA Tester</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead Project Manager</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead UI Designer</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead Animator</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead Level Designer</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>Lead Writer</td>
								<td>Brayden Hill</td>
							</tr>
							<tr>
								<td>"The Other Side"</td>
								<td>
									<a
										href="https://pixabay.com/users/coma-media-24399569/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=175173"
										>Yurii Semchyshyn</a
									>
									from
									<a
										href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=175173"
										>Pixabay</a
									>
								</td>
							</tr>
							<tr>
								<td>"Milk Shake"</td>
								<td>
									<a
										href="https://pixabay.com/users/coma-media-24399569/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116330"
										>Yurii Semchyshyn</a
									>
									from
									<a
										href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116330"
										>Pixabay</a
									>
								</td>
							</tr>
							<tr>
								<td>Sound Effects </td>
								<td><a href="https://www.Zapsplat.com" target="_">Zapsplat.com</a></td>
							</tr>
						</tbody>
					</table>
					<div class="controlButtons">
						<button class="menuButton shadow" on:click={() => buttonClick(MenuStates.MainMenu)}>
							Back
						</button>
					</div>
				</div>
			</div>
		{/if}

		<canvas bind:this={canvas} id="menuCanvas"></canvas>
	</div>
{/if}

<style>
	th,
	td {
		padding: 8px;
	}
	.container {
		display: flex;
		align-items: center;
		width: 100%;
		flex-direction: column;
		height: 100vh;
	}

	.topbar {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--c4);
		background: var(--c5);
		margin: 1em;
		border: 8px solid var(--c2);
		border-radius: 2rem;
		width: calc(100vw - 4em);
		padding: 4px 0 4px 0;
	}

	#playerNameInput {
		border-radius: 2rem;
		background-color: var(--c4);
		font-size: 1rem;
		color: var(--c3);
		text-align: center;
		padding: 4px;
	}

	.nameInputContainer {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		align-content: center;
		flex-wrap: nowrap;
		color: var(--c5);
	}

	#menuCanvas {
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: -1;
	}

	.customControls {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-content: center;
		flex-wrap: nowrap;
		justify-content: flex-start;
	}

	.customControls tr {
		font-size: 1.5rem;
	}

	.control {
		color: var(--c4);
		cursor: pointer;
		transition-duration: 0.35s;
		text-shadow: 12px 8px 7px rgba(0, 0, 0, 0.8);
	}

	.control:hover {
		text-decoration: underline;
		text-underline-offset: 8px;
		text-shadow: 16px 12px 7px rgba(0, 0, 0, 0.8);
		opacity: 1;
		text-decoration-thickness: 4px;
	}

	.scores {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-content: center;
		flex-wrap: nowrap;
		justify-content: flex-start;
		max-height: 30vh;
		overflow-y: scroll;
	}
	.scores > h3 {
		margin: 0.5rem 0 0.5rem 0;
	}
</style>
