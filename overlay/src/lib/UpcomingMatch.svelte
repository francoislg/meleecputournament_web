<script lang="ts">
	import { matches, nextMatchInSeconds } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div class="matches">
	{#if $nextMatchInSeconds}
		<h2>
			<MeleeText
				text={$nextMatchInSeconds <= 0
					? `Bets closing`
					: `Bets closing in ${$nextMatchInSeconds} seconds`}
			/>
		</h2>
	{:else if $matches.upcoming}
		<div class="match">
			<h3>
				<MeleeText
					text="{$matches.upcoming.match.isCustomMatch ? 'Custom ' : ''} '{$matches.upcoming.match
						.ruleset}' match open for bets"
				/>
			</h3>

			<div>
				(#1) {$matches.upcoming.match.first.name}
				<span class="character">({$matches.upcoming.match.first.character})</span>
				- {$matches.upcoming.bets.player1} points
				{#if $matches.upcoming.match.first?.temporary}
					<div class="temp">Temporary character, take its place with !enter</div>
				{/if}
			</div>
			<div><MeleeText text="VS" /></div>
			<div>
				(#2) {$matches.upcoming.match.second.name}
				<span class="character">({$matches.upcoming.match.second.character})</span>
				- {$matches.upcoming.bets.player2} points
				{#if $matches.upcoming.match.second?.temporary}
					<div class="temp">Temporary character, take its place with !enter</div>
				{/if}
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

	.temp {
		font-size: 0.7em;
	}
</style>
