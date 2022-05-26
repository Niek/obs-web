<script>
  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';
  import SourceButton from './SourceButton.svelte';

  export let programScene = {};
  export let previewScene = {};
  export let scenes = [];
  export let buttonStyle = 'text'; // text, screenshot, icon
  export let editable = false;

  let scenesFiltered = [];
  let isStudioMode = false;
  let sceneIcons = JSON.parse(window.localStorage.getItem('sceneIcons') || "{}");

  $: scenesFiltered = scenes.filter((scene) => scene.name.indexOf('(hidden)') === -1);
  // store sceneIcons on change
  $: window.localStorage.setItem('sceneIcons', JSON.stringify(sceneIcons));

  onMount(async function() {
    let data = await sendCommand('GetSceneList');
    programScene = {name: data['current-scene']};
    scenes = data.scenes
    console.log('GetSceneList', programScene);
    data = await sendCommand('GetStudioModeStatus');
    if (data && data.studioMode) {
      isStudioMode = true;
      previewScene = (await sendCommand('GetPreviewScene')) || {};
    }
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

  obs.on('SourceRenamed', async(data) => {
    if (data.sourceType == 'scene') {
      console.log('SourceRenamed', data.previousName, data.newName);
      // Rename in scenes
      for (let i=0; i < scenes.length; i++) {
        if (scenes[i].name == data.previousName) {
          scenes[i].name = data.newName;
          break;
        }
      }
      // Rename in sceneIcons
      sceneIcons[data.newName] = sceneIcons[data.previousName];
    }
  });

  obs.on('SwitchScenes', (data) => {
    console.log('SwitchScenes', data['scene-name'], data.sources.length);
    programScene = data || {};
    programScene.name = programScene['scene-name'];
  });

  obs.on('PreviewSceneChanged', async(data) => {
    console.log('PreviewSceneChanged', data.sceneName);
    previewScene = data || {};
    previewScene.name = previewScene['scene-name'];
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

  function onNameChange(event) {
    sendCommand('SetSourceName', {sourceName: event.target.title, newName: event.target.value});
  }
  function onIconChange(event) {
    sceneIcons[event.target.title] = event.target.value;
  }
</script>

<ol
  class:column={editable}
  class:with-icon={buttonStyle == 'icon'}
  >
  {#if editable}
    {#each scenes as scene}
    <li>
      <label class="label">Name</label>
      <input type="text" class="input" title={scene.name} value={scene.name} on:change={onNameChange} />
      <label class="label">Icon</label>
      <input type="text" class="input" title={scene.name} value={sceneIcons[scene.name] || ""} on:change={onIconChange} />
    </li>
    {/each}
  {:else}
    {#each scenesFiltered as scene}
    <li>
      <SourceButton name={scene.name}
        on:click={sceneClicker(scene)}
        isProgram={programScene.name == scene.name}
        isPreview={previewScene.name == scene.name}
        buttonStyle={buttonStyle}
        icon={sceneIcons[scene.name] || `#${Math.floor(Math.random()*16777215).toString(16)}`}
      />
    </li>
    {/each}
  {/if}
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
  ol.column {
    flex-direction: column;
    gap: 1rem;
  }
  li {
    display: inline-block;
    min-width: 10rem;
    flex-grow: 1;
  }
  ol.with-icon {
    justify-content: center;
  }
  ol.with-icon li {
    min-width: 0;
    flex-grow: 0;
    flex-shrink: 1;
  }
</style>