<script>
  import { onDestroy, onMount } from 'svelte'
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

  $: scenesFiltered = scenes.filter((scene) => scene.sceneName.indexOf('(hidden)') === -1).reverse()
  // store sceneIcons on change
  $: window.localStorage.setItem('sceneIcons', JSON.stringify(sceneIcons))

  onMount(async function () {
    let data = await sendCommand('GetSceneList')
    console.log('GetSceneList', data)
    programScene = data.currentProgramSceneName || ''
    previewScene = data.currentPreviewSceneName
    scenes = data.scenes
    data = await sendCommand('GetStudioModeEnabled')
    if (data && data.studioModeEnabled) {
      isStudioMode = true
      previewScene = data.currentPreviewSceneName || ''
    }
  })

  // Named handlers (not inline arrow functions passed straight to obs.on)
  // so onDestroy can remove the exact same references via obs.off() - same
  // pattern already used in AudioMixer.svelte/SceneItemsPanel.svelte. This
  // component lives inside +page.svelte's `{#if connected}` block, so it's
  // destroyed and recreated on every disconnect/reconnect - without this
  // cleanup, every reconnect stacks another full set of listeners onto the
  // long-lived `obs` singleton.
  function handleStudioModeStateChanged (data) {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data.studioModeEnabled
    previewScene = programScene
  }

  function handleSceneListChanged (data) {
    console.log('SceneListChanged', data.scenes.length)
    scenes = data.scenes
  }

  function handleSceneCreated (data) {
    console.log('SceneCreated', data)
  }

  // SceneListChanged (above) already fires with a fresh, complete scenes
  // array whenever OBS's own scene-list-changed frontend event fires,
  // which covers removal - this handler doesn't need to (and, before this
  // fix, incorrectly tried to) also patch `scenes` itself. The previous
  // `delete scenes[i]` mutated the array in place without a reassignment,
  // which doesn't trigger Svelte reactivity at all and leaves a hole
  // instead of shrinking the array - dead/buggy code that happened not to
  // matter in practice because SceneListChanged's own reassignment
  // superseded it anyway.
  function handleSceneRemoved (data) {
    console.log('SceneRemoved', data)
  }

  function handleSceneNameChanged (data) {
    console.log('SceneNameChanged', data)
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].sceneName === data.oldSceneName) {
        scenes[i].sceneName = data.sceneName
      }
    }
    // Rename in sceneIcons
    sceneIcons[data.sceneName] = sceneIcons[data.oldSceneName]
  }

  function handleCurrentProgramSceneChanged (data) {
    console.log('CurrentProgramSceneChanged', data)
    programScene = data.sceneName || ''
  }

  function handleCurrentPreviewSceneChanged (data) {
    console.log('CurrentPreviewSceneChanged', data)
    previewScene = data.sceneName
  }

  obs.on('StudioModeStateChanged', handleStudioModeStateChanged)
  obs.on('SceneListChanged', handleSceneListChanged)
  obs.on('SceneCreated', handleSceneCreated)
  obs.on('SceneRemoved', handleSceneRemoved)
  obs.on('SceneNameChanged', handleSceneNameChanged)
  obs.on('CurrentProgramSceneChanged', handleCurrentProgramSceneChanged)
  obs.on('CurrentPreviewSceneChanged', handleCurrentPreviewSceneChanged)

  onDestroy(() => {
    obs.off('StudioModeStateChanged', handleStudioModeStateChanged)
    obs.off('SceneListChanged', handleSceneListChanged)
    obs.off('SceneCreated', handleSceneCreated)
    obs.off('SceneRemoved', handleSceneRemoved)
    obs.off('SceneNameChanged', handleSceneNameChanged)
    obs.off('CurrentProgramSceneChanged', handleCurrentProgramSceneChanged)
    obs.off('CurrentPreviewSceneChanged', handleCurrentPreviewSceneChanged)
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
    sendCommand('SetSceneName', { sceneName: event.target.title, newSceneName: event.target.value })
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
    {#each [...scenes].reverse() as scene}
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
