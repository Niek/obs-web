<script>
  export let screenshots = false;
  export let programScene = {};
  export let previewScene = {};
  export let scenes = [];
  let scenesFiltered = [];
  let isStudioMode = false;

  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';
  import SourceButton from './SourceButton.svelte';

  $: scenesFiltered = scenes.filter((scene) => scene.name.indexOf('(hidden)') === -1);

  onMount(async function() {
    let data = await sendCommand('GetSceneList');
    programScene = data.currentScene;
    scenes = data.scenes
    console.log('GetSceneList', programScene);
    data = await sendCommand('GetStudioModeStatus');
    isStudioMode = (data && data.studioMode) || false;
  })

  obs.on('StudioModeSwitched', async (data) => {
    console.log('StudioModeSwitched', data.newState);
    isStudioMode = data.newState;
    previewScene = programScene;
  });

  obs.on('ScenesChanged', async(data) => {
    console.log('ScenesChanged', scenes.length);
    scenes = data.scenes;
  });

  obs.on('SwitchScenes', (data) => {
    console.log('SwitchScenes', data['scene-name'], data.sources.length);
    programScene = data || {};
  });

  obs.on('PreviewSceneChanged', async(data) => {
    console.log('PreviewSceneChanged', data.sceneName);
    previewScene = data || {};
  });

  function sceneClicker(scene) {
    return async function() {
      if (isStudioMode) {
        await sendCommand('SetPreviewScene', { 'scene-name': scene.name });
      } else {
        await sendCommand('SetCurrentScene', { 'scene-name': scene.name });
      }
    }
  }
</script>

<ol>
  {#each scenesFiltered as scene}
  <li>
    <SourceButton name={scene.name}
      on:click={sceneClicker(scene)}
      isProgram={programScene.name == scene.name}
      isPreview={previewScene.name == scene.name}
      screenshot={screenshots}
    />
  </li>
  {/each}
</ol>

<style>
  ol {
    list-style: None;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: .5rem;
    margin-bottom: 2rem;
  }
  li {
    display: inline-block;
    min-width: 10rem;
    flex-grow: 1;
  }
</style>