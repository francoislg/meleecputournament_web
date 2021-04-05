<script lang="ts">
	import { entries } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div>
	<h2><MeleeText text="Last Entries" /></h2>
	{#each $entries.entries as { name, bet }, index}
		<div>{name}</div>
	{/each}
</div>

<style>
	div {
		text-align: center;
	}
</style>