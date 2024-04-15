<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	$: show = false;

	onMount(async () => {
		show = true;
		await tick();
	});

	onDestroy(() => {
		show = false;
	});
</script>

{#if show}
	<div class="container">
		<div in:fly={{ x: -200, duration: 1000 }} class="topbar shadow">
			<h1 style="margin:0">Slyther.io</h1>
		</div>

		<div in:fly|global={{ x: -200, duration: 1000 }} class="menuContainer">
			<div class="menu shadow">
				<a class="menuButton shadow" href="/game">New Game</a>
				<a class="menuButton shadow" href="/">High Scores</a>
				<a class="menuButton shadow" href="/">Controls</a>
				<a class="menuButton shadow" href="/">Credits</a>
			</div>
		</div>

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
		height: 30vh;
		width: 20vw;
		align-items: stretch;
		justify-content: space-evenly;
		align-content: center;
		flex-wrap: nowrap;
		padding: 1rem;
		background: var(--c1);
		border: 8px solid var(--c2);
		border-radius: 2rem;
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
</style>
