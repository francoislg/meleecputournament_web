<script lang="ts">
	import { matches, winner, nextMatchInSeconds } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div class="matches">
	{#if $matches.tournamentUrl}
		<div class="match">
			<h3><MeleeText text="Tournament" /></h3>
			<span>
				challonge.com/{$matches.tournamentUrl}
			</span>
		</div>
	{/if}
	{#if $matches.current}
		<div class="match">
			<h3><MeleeText text="Currently" /></h3>
			<span>
				{$matches.current.first.name}
				{#if $winner && $winner.isWinnerFirstPlayer}
					- <MeleeText text="WINNER" />
				{/if}
			</span>
			<div><MeleeText text="VS" /></div>
			<span>
				{$matches.current.second.name}
				{#if $winner && !$winner.isWinnerFirstPlayer}
					- <MeleeText text="WINNER" />
				{/if}
			</span>
		</div>
	{/if}
	{#if $matches.upcoming}
		<div class="match">
			<h3>
				<MeleeText text="Upcoming" />
				{#if $nextMatchInSeconds}
					<div>
						<MeleeText
							text={$nextMatchInSeconds <= 0 ? 'Soon' : `in ${$nextMatchInSeconds} seconds`}
						/>
					</div>
				{/if}
			</h3>

			{$matches.upcoming.first.name}
			<div><MeleeText text="VS" /></div>
			{$matches.upcoming.second.name}
		</div>
	{/if}
</div>

<style>
	.match {
		text-align: center;
	}
</style>
