<script lang="ts">
	import { leaderboard } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div>
	<h2><MeleeText text="Leaderboards" /></h2>
	{#each $leaderboard.players as { name, points }, index}
		<div>#{index + 1} - {name} {points}pts</div>
	{/each}
</div>
