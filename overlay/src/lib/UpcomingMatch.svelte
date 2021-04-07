<script lang="ts">
	import { matches } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div class="matches">
	{#if $matches.upcoming}
		<div class="match">
			<h3>
				<MeleeText text="Upcoming" />
			</h3>

			(#1) {$matches.upcoming.match.first.name} - {$matches.upcoming.bets.player1} points
			<div><MeleeText text="VS" /></div>
			(#2) {$matches.upcoming.match.second.name} - {$matches.upcoming.bets.player2} points
		</div>
	{/if}
</div>

<style>
	.match {
		text-align: center;
	}
</style>
