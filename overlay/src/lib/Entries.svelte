<script lang="ts">
	import { entries } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

<div>
	<h2><MeleeText text="Queue" /></h2>
	{#if $entries.entries && $entries.entries.length === 0}
		<div>None! Enter a character with the<br/>!at enter [character] [name] command, such as<br/>!at enter Mario NotLuigi</div>
	{/if}
	{#each $entries.entries as { name, bet }, index}
		<div>{name}</div>
	{/each}
</div>

<style>
	div {
		text-align: center;
	}
</style>