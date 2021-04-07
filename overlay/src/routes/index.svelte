<script context="module">
	export const ssr = false;
</script>

<script lang="ts">
	import Connected from '$lib/Connected.svelte';
	import Leaderboard from '$lib/Leaderboard.svelte';
	import Upcoming from '$lib/UpcomingMatch.svelte';
	import Entries from '$lib/Entries.svelte';
	import Help from '$lib/Help.svelte';
	import CurrentMatch from '$lib/CurrentMatch.svelte';
	import Tournament from '$lib/Tournament.svelte';
	import PanelBetweenMatches from '$lib/PanelBetweenMatches.svelte';
</script>

<main>
	<Connected />
	<Tournament />
	<Help />
	<PanelBetweenMatches>
		<Leaderboard />
		<Entries />
	</PanelBetweenMatches>
	<div class="bottompanel">
		<Upcoming />
	</div>
	<CurrentMatch />
</main>

<style>
	@font-face {
		font-family: 'Smash';
		src: url(/FOT-RodinHimawariPro-UB.otf);
	}

	:root {
		font-family: 'Smash';
		color: white;
		word-break: break-word;
		text-shadow: 0 0 10px black, 0 0 10px black, 2px 2px black;
		font-size: 1.2em;
	}

	main:before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		top: 0;
		z-index: -1;
	}

	.bottompanel {
		position: fixed;
		bottom: 50px;
		width: 100%;
		text-align: center;
	}

	:global(h2) {
		margin: 0;
		margin-bottom: 20px;
	}
</style>
