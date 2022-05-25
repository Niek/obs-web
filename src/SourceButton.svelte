<script>
  export let name;
  export let screenshot = false;
  export let isProgram = false;
  export let isPreview = false;
  let img = '';

  import { sendCommand } from './obs.js';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

  $: screenshot ? updateThumbnail(name) : false;

  async function updateThumbnail(name) {
    console.log('TakeSourceScreenshot', name);
    let data = await sendCommand('TakeSourceScreenshot', {
      sourceName: name,
      embedPictureFormat: 'jpg',
      width: 192,
      height: 108,
    });
    img = data.img;
  }
</script>

<button
  class="notification"
  class:title={!img}
  class:is-danger={isProgram}
  class:is-warning={isPreview}
  class:is-info={!isProgram && !isPreview}
  on:click={() => dispatch('click')}
  >
  {#if img}<img src={img} alt={name} style="display:block"/>{/if}
  {name}
</button>

<style>
  button {
    border: none;
    width: 192px;
    height: 126px;
    text-align: center;
    width: 100%;
    cursor: pointer;
  }
  button:not(.title) {
    padding: 0;
  }
</style>