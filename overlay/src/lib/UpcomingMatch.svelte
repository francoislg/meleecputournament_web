<script lang="ts">
	import { matches } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div class="matches">
	{#if $matches.upcoming}
		<div class="match">
			<h3>
				<MeleeText text="Open for bets" />
			</h3>

			<div>
				(#1) {$matches.upcoming.match.first.name}
				<span class="character">({$matches.upcoming.match.first.character})</span>
				- {$matches.upcoming.bets.player1} points
			</div>
			<div><MeleeText text="VS" /></div>
			<div>
				(#2) {$matches.upcoming.match.second.name}
				<span class="character">({$matches.upcoming.match.second.character})</span>
				- {$matches.upcoming.bets.player2} points
			</div>
		</div>
	{/if}
</div>

<style>
	.match {
		text-align: center;
	}

	.character {
		font-size: 0.5em;
	}
</style>
