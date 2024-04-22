<script lang="ts">
	import { playerName } from '$lib/shared/stores';
	import { onDestroy, onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	$: show = false;
	$: state = MenuStates.MainMenu;
	$: name = '';

	enum MenuStates {
		MainMenu,
		EnterName
	}

	onMount(async () => {
		show = true;
		await tick();
	});

	onDestroy(() => {
		show = false;
	});

	function setPlayerName() {
		localStorage.setItem('slyther.io.playerName', name);
	}
</script>

{#if show}
	<div class="container">
		<div in:fly={{ x: -200, duration: 1000 }} class="topbar shadow">
			<h1 style="margin:0">Slyther.io</h1>
		</div>

		<!-- Main Menu -->
		{#if state == MenuStates.MainMenu}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<button
						class="menuButton shadow"
						on:click={() => {
							state = MenuStates.EnterName;
						}}>New game</button
					>
					<a class="menuButton shadow" href="/">High Scores</a>
					<a class="menuButton shadow" href="/">Controls</a>
					<a class="menuButton shadow" href="/">Settings</a>
					<a class="menuButton shadow" href="/">Credits</a>
				</div>
			</div>
		{/if}

		<!-- Name select -->
		{#if state == MenuStates.EnterName}
			<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
				<div class="menu shadow">
					<div class="nameInputContainer">
						<label for="playerNameInput">Enter your name</label>
						<input type="text" bind:value={name} id="playerNameInput" />
					</div>
					<div class="controlButtons">
						<button
							class="menuButton shadow"
							on:click={() => {
								state = MenuStates.MainMenu;
							}}
						>
							Back
						</button>
						<a href="/game" class="menuButton shadow" on:click={setPlayerName}> Next</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tutorial Message -->

		<!-- Joining Spinner -->

		<div class="footer"></div>
	</div>
{/if}

<style>
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
		background: var(--c1);
		margin: 1em;
		border: 8px solid var(--c2);
		border-radius: 2rem;
		width: calc(100vw - 4em);
		padding: 4px 0 4px 0;
	}

	.menuContainer {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		flex-wrap: nowrap;
		align-content: center;
		align-items: center;
		width: 100%;
		justify-content: space-around;
	}

	.menu {
		display: flex;
		flex-direction: column;
		width: 20vw;
		justify-content: space-evenly;
		align-content: center;
		flex-wrap: nowrap;
		padding: 1rem;
		background: var(--c1);
		border: 8px solid var(--c2);
		border-radius: 2rem;
		align-items: stretch;
	}

	.menuButton {
		background-color: #f4511e;
		border: none;
		color: white;
		padding: 16px 32px;
		text-align: center;
		font-size: 16px;
		margin: 4px 2px;
		opacity: 0.75;
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

	.controlButtons {
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
		align-content: center;
		flex-wrap: nowrap;
		margin: 1rem 0 0 0;
	}

	.nameInputContainer {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		align-content: center;
		flex-wrap: nowrap;
		margin: 0 0 1rem 0;
	}
</style>
