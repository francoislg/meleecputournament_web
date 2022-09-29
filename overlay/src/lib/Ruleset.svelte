<script lang="ts">
	import { matches } from './_serverstore';
</script>

{#if $matches}
	{#if $matches.current}
		<div class="ruleset">
			<span>
				Ruleset: {$matches.current.match.ruleset}
			</span>
		</div>
	{/if}
{/if}

<style>
	.ruleset {
		position: fixed;
		top: 40px;
		left: 0px;
		right: 0px;
		text-align: center;
	}
</style>
