<script lang="ts">
	import MeleeText from './MeleeText.svelte';
	import { nextMatchInSeconds } from './_serverstore';

	let starting;
	starting = $nextMatchInSeconds;
</script>

<div class="panel">
	{#if $nextMatchInSeconds}
		<div class="background">
			<slot />
			<div class="next">
				<MeleeText
					text={$nextMatchInSeconds <= 0
						? 'Next match starting soon'
						: `Next match starting in ${$nextMatchInSeconds} seconds`}
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	.panel {
		margin-top: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		align-content: center;
	}

	.background {
		background-color: #ffffffcc;
	}

	.next {
		text-align: center;
	}

	:global(.background div) {
		margin: 10px;
	}
</style>
