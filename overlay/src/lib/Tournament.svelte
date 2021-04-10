<script lang="ts">
	import { matches } from './_serverstore';
	import MeleeText from './MeleeText.svelte';
</script>

{#if $matches}
    {#if $matches.tournamentUrl}
        <div class="tournament">
            <span>
                <MeleeText text="Tournament: " />
                challonge.com/{$matches.tournamentUrl}
            </span>
        </div>
    {:else}
    <div class="tournament">
        <span>
            Running in single matches mode until more entries are added.
        </span>
    </div>
    {/if}
{/if}

<style>
    .tournament {
        position: fixed;
        top: 0px;
        left: 50px;
    }
</style>