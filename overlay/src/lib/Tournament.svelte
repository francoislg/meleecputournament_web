<script lang="ts">
	import { matches } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

{#if $matches.tournamentUrl}
    <div class="tournament">
        <span>
            <MeleeText text="Tournament: " />
            challonge.com/{$matches.tournamentUrl}
        </span>
    </div>
{/if}

<style>
    .tournament {
        position: fixed;
        top: 0px;
        left: 50px;
    }
</style>