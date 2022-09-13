<script>
  import { onMount, onDestroy } from 'svelte'
  import { obs, sendCommand } from './obs.js'

  export let imageFormat = 'jpg'

  let isStudioMode = false
  let programScene = ''
  let previewScene = ''

  let program = {}
  let preview = {}
  let screenshotInterval
  let transitions = []
  // let currentTransition = ''

  onMount(async () => {
    let data
    if (!programScene) {
      data = await sendCommand('GetCurrentProgramScene')
      programScene = data.currentProgramSceneName || ''
    }
    data = await sendCommand('GetStudioModeEnabled')
    if (data && data.studioModeEnabled) {
      isStudioMode = true
      data = await sendCommand('GetCurrentPreviewScene')
      previewScene = data.currentPreviewSceneName || ''
    }

    data = await sendCommand('GetSceneTransitionList')
    console.log('GetSceneTransitionList', data)
    transitions = data.transitions || []
    // currentTransition = data.currentSceneTransitionName || ''
    screenshotInterval = setInterval(getScreenshot, 1000)
  })

  onDestroy(() => {
    clearInterval(screenshotInterval)
  })

  // eslint-disable-next-line
  $: getScreenshot(), programScene, previewScene

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data.studioModeEnabled
    if (isStudioMode) {
      previewScene = programScene
    }
  })

  obs.on('CurrentPreviewSceneChanged', async (data) => {
    console.log('CurrentPreviewSceneChanged', data.sceneName)
    previewScene = data.sceneName
  })

  obs.on('CurrentProgramSceneChanged', async (data) => {
    console.log('CurrentProgramSceneChanged', data.sceneName)
    programScene = data.sceneName
  })

  obs.on('SceneNameChanged', async (data) => {
    if (data.oldSceneName === programScene) programScene = data.sceneName
    if (data.oldSceneName === previewScene) previewScene = data.sceneName
  })

  // TODO: does not exist???
  obs.on('TransitionListChanged', async (data) => {
    console.log('TransitionListChanged', data)
    transitions = data.transitions || []
  })

  async function getScreenshot () {
    if (!programScene) return
    let data = await sendCommand('GetSourceScreenshot', {
      sourceName: programScene,
      imageFormat,
      imageWidth: 960,
      imageHeight: 540
    })
    if (data && data.imageData && program) {
      program.src = data.imageData
      program.className = ''
    }

    if (isStudioMode) {
      if (previewScene !== programScene) {
        data = await sendCommand('GetSourceScreenshot', {
          sourceName: previewScene,
          imageFormat,
          imageWidth: 960,
          imageHeight: 540
        })
      }
      if (data && data.imageData && preview) {
        preview.src = data.imageData
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
        on:click={async () => {
          await sendCommand('SetCurrentSceneTransition', { transitionName: transition.transitionName })
          await sendCommand('TriggerStudioModeTransition')
        }}
        >{transition.transitionName}</button>
      {/each}
    </div>
  {/if}
  <div class="column">
    <img bind:this={program} alt="Program"/>
  </div>
</div>
