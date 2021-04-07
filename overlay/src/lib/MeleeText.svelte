<script lang="ts">
    export let text: string;
</script>

<span data-text={text}>{text}</span>

<style>
    span {
		background: -webkit-linear-gradient(black, darkred);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		text-shadow: none;
	}

	span::before {
        position: absolute;
        z-index: -1;
		content: attr(data-text);
		-webkit-text-stroke: 2px white;
        text-shadow: 1px 1px 5px black, 1px 1px 5px black;
	}
</style>