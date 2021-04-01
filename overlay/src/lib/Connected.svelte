<script lang="ts">
	import {connected} from "./_serverstore";
</script>

<div>
	{$connected ? '🟢' : '🔴'}
</div>

<style>
	div {
		position: fixed;
		top: 5px;
		right: 5px;
		font-size: 5px;
	}
</style>