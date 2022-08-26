<script>
  import { onMount } from 'svelte'
  import { obs, sendCommand } from './obs.js'
  import SourceButton from './SourceButton.svelte'

  export let programScene = {}
  export let previewScene = {}
  export let scenes = []
  export let buttonStyle = 'text' // text, screenshot, icon
  export let editable = false

  let scenesFiltered = []
  let isStudioMode = false
  const sceneIcons = JSON.parse(window.localStorage.getItem('sceneIcons') || '{}')

  $: scenesFiltered = scenes.filter((scene) => scene.sceneName.indexOf('(hidden)') === -1)
  // store sceneIcons on change
  $: window.localStorage.setItem('sceneIcons', JSON.stringify(sceneIcons))

  onMount(async function () {
    let data = await sendCommand('GetSceneList')
    programScene = data.currentProgramSceneName || ''
    scenes = data.scenes
    console.log('GetSceneList', data)
    data = await sendCommand('GetStudioModeEnabled')
    if (data && data.studioModeEnabled) {
      isStudioMode = true
      previewScene = data.currentPreviewSceneName || ''
    }
  })

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data.studioModeEnabled
    previewScene = programScene
  })

  obs.on('SceneListChanged', async (data) => {
    console.log('SceneListChanged', data.scenes.length)
    scenes = data.scenes
  })

  obs.on('SourceRenamed', async (data) => {
    if (data.sourceType === 'scene') {
      console.log('SourceRenamed', data.previousName, data.newName)
      // Rename in scenes
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i] === data.previousName) {
          scenes[i] = data.newName
          break
        }
      }
      // Rename in sceneIcons
      sceneIcons[data.newName] = sceneIcons[data.previousName]
    }
  })

  obs.on('SwitchScenes', (data) => {
    console.log('SwitchScenes', data['scene-name'], data.sources.length)
    programScene = data || {}
    programScene = programScene['scene-name']
  })

  obs.on('CurrentPreviewSceneChanged', async (data) => {
    console.log('CurrentPreviewSceneChanged', data.sceneName)
    previewScene = data.sceneName
  })

  function sceneClicker (scene) {
    return async function () {
      if (isStudioMode) {
        await sendCommand('SetCurrentPreviewScene', { sceneName: scene.sceneName })
      } else {
        await sendCommand('SetCurrentProgramScene', { sceneName: scene.sceneName })
      }
    }
  }

  function onNameChange (event) {
    sendCommand('SetSourceName', { sourceName: event.target.title, newName: event.target.value })
  }
  function onIconChange (event) {
    sceneIcons[event.target.title] = event.target.value
  }
</script>

<ol
  class:column={editable}
  class:with-icon={buttonStyle === 'icon'}
  >
  {#if editable}
    {#each scenes as scene}
    <li>
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="label">Name</label>
      <input type="text" class="input" title={scene.sceneName} value={scene.sceneName} on:change={onNameChange} />
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="label">Icon</label>
      <input type="text" class="input" title={scene.sceneName} value={sceneIcons[scene.sceneName] || ''} on:change={onIconChange} />
    </li>
    {/each}
  {:else}
    {#each scenesFiltered as scene}
    <li>
      <SourceButton name={scene.sceneName}
        on:click={sceneClicker(scene)}
        isProgram={programScene === scene.sceneName}
        isPreview={previewScene === scene.sceneName}
        buttonStyle={buttonStyle}
        icon={sceneIcons[scene.sceneName] || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
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
