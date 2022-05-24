<script>
  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';

  export let isStudioMode;
  export let programScene;
  export let previewScene;

  let program = {};
  let preview = {};
  let screenshotInterval;

  onMount(async() => {
    screenshotInterval = setInterval(getScreenshot, 2000);
    return () => {
      clearInterval(screenshotInterval);
    };
  });

  $: getScreenshot(), programScene, previewScene;

  obs.on('PreviewSceneChanged', async(data) => {
    console.log(`New Preview Scene: ${data.sceneName}`);
    previewScene = data.sceneName;
  });
  
  obs.on('SwitchScenes', async(data) => {
    console.log(`New Program Scene: ${data.sceneName}`);
    programScene = data.sceneName;
  });

  async function getScreenshot() {
    let data = await sendCommand('TakeSourceScreenshot', {
      sourceName: programScene,
      embedPictureFormat: 'jpg',
      width: 960,
      height: 540,
    });
    if (data && data.img) {
      program.src = data.img;
      program.className = '';
    }

    if (isStudioMode) {
      if (previewScene != programScene) {
        data = await sendCommand('TakeSourceScreenshot', {
          sourceName: previewScene,
          embedPictureFormat: 'jpg',
          width: 960,
          height: 540,
        });
      }
      if (data && data.img) {
        preview.src = data.img;
      }
    }
  }
</script>

<div class="columns is-centered is-vcentered has-text-centered">
  {#if isStudioMode}
    <div class="column">
      <img bind:this={preview} class="has-background-dark" alt="Preview" />
    </div>
    <div class="column is-narrow">
      <button class="button is-fullwidth is-info"
        on:click={async ()=>{await sendCommand('TransitionToProgram')}}
        >Transition</button>
    </div>
  {/if}
  <div class="column">
    <img bind:this={program} alt="Program"/>
  </div>
</div>

