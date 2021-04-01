<script context="module">
	export const ssr = false;
</script>

<script lang="ts">
	import Connected from '$lib/Connected.svelte';
	import Leaderboard from '$lib/Leaderboard.svelte';
	import Matches from '$lib/Matches.svelte';
	import Entries from '$lib/Entries.svelte';
	import Help from "$lib/Help.svelte";
</script>

<main>
	
	<Connected />
	<Leaderboard />
	<Matches />
	<Entries />
	<Help />
</main>

<style>
	@font-face {
		font-family: 'Smash';
		src: url(/GalliardStd-Ultra.otf)
	}

	:root {
		font-family: 'Smash';
		word-break: break-word;
	}

	main:before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		top: 0;
		background-image: url(./background.jpg);
		z-index: -1;
		opacity: 0.4;
	}
</style>
