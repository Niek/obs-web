<script>
  export let name;
  export let img = '';
  export let isProgram = false;
  export let isPreview = false;

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
</script>

<button
  class="tile is-child has-text-centered is-size-6-mobile"
  class:title={!img}
  class:notification={!img}
  class:is-danger={isProgram}
  class:is-warning={isPreview}
  class:is-info={!isProgram && !isPreview}
  on:click={() => dispatch('click')}
  >
  {#if img}<img src={img} alt={name} style="display:block"/>{/if}
  {name}
</button>
