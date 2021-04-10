<script lang="ts">
	import { matches, winner } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

{#if $matches.current}
	<div class="match">
		<div class="left">
			{$matches.current.match.first.name}
			<span class="character">({$matches.current.match.first.character})</span>
			{#if $winner && $winner.isWinnerFirstPlayer}
				- <MeleeText text="WINNER" />
			{/if}
			<div class="points">{$matches.current.bets.player1} points</div>
		</div>
		<div class="right">
			{$matches.current.match.second.name}
			<span class="character">({$matches.current.match.second.character})</span>
			{#if $winner && !$winner.isWinnerFirstPlayer}
				- <MeleeText text="WINNER" />
			{/if}
			<div class="points">{$matches.current.bets.player2} points</div>
		</div>
	</div>
{/if}

<style>
	.match {
		text-align: center;
		position: fixed;
		bottom: 130px;
		left: 0;
		right: 0;
		font-size: 1.5em;
		width: 100%;
	}

	.left {
		position: absolute;
		left: 50px;
		text-align: left;
	}

	.right {
		position: absolute;
		right: 50px;
		text-align: right;
	}

	.character {
		font-size: 0.5em;
	}

	.points {
		font-size: 0.8em;
	}
</style>
