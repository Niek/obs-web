<script>
  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';

  let isStudioMode = false;
  let programScene = '';
  let previewScene = '';

  let program = {};
  let preview = {};
  let screenshotInterval;
  let transitions = [];
  let currentTransition = [];

  onMount(async() => {
    let data;
    if (!programScene) {
      data = await sendCommand('GetCurrentScene');
      programScene = data.name || ''
    }
    data = await sendCommand('GetStudioModeStatus');
    if (data && data.studioMode) {
      isStudioMode = true;
      data = await sendCommand('GetPreviewScene');
      previewScene = data.name || '';
    }

    data = await sendCommand('GetTransitionList');
    console.log('GetTransitionList', data);
    transitions = data.transitions || [];
    currentTransition = data['current-transition'] || '';
    screenshotInterval = setInterval(getScreenshot, 1000);
    return () => {
      clearInterval(screenshotInterval);
    };
  });

  $: getScreenshot(), programScene, previewScene;

  obs.on('StudioModeSwitched', async (data) => {
    console.log('StudioModeSwitched', data.newState);
    isStudioMode = data.newState;
    if (isStudioMode) {
      previewScene = programScene;
    }
  });

  obs.on('PreviewSceneChanged', async(data) => {
    console.log('PreviewSceneChanged', data.sceneName);
    previewScene = data.sceneName;
  });
  
  obs.on('SwitchScenes', async(data) => {
    console.log('SwitchScenes', data.sceneName);
    programScene = data.sceneName;
  });

  obs.on('SourceRenamed', async(data) => {
    if (data.previousName == programScene) programScene = data.newName;
    if (data.previousName == previewScene) previewScene = data.newName;
  });

  obs.on('TransitionListChanged', async(data) => {
    console.log('TransitionListChanged', data);
    transitions = data.transitions || [];
  });

  async function getScreenshot() {
    if (!programScene) return;
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
      {#each transitions as transition}
      <button class="button is-fullwidth is-info" style="margin-bottom: .5rem;"
        on:click={async ()=>{await sendCommand("TransitionToProgram", {"with-transition": {"name": transition.name}})}}
        >{transition.name}</button>
      {/each}
    </div>
  {/if}
  <div class="column">
    <img bind:this={program} alt="Program"/>
  </div>
</div>

