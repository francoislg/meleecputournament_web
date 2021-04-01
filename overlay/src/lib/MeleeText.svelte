<script lang="ts">
    export let text: string;
</script>

<span data-text={text}>{text}</span>

<style>
    span {
		background: -webkit-linear-gradient(black, darkred);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	span::before {
        position: absolute;
        z-index: -1;
		content: attr(data-text);
		-webkit-text-stroke: 2px white;
        text-shadow: 1px 1px 5px #000000;
	}
</style>