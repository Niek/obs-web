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
    obs.off('StudioModeStateChanged', handleStudioModeStateChanged)
    obs.off('CurrentPreviewSceneChanged', handleCurrentPreviewSceneChanged)
    obs.off('CurrentProgramSceneChanged', handleCurrentProgramSceneChanged)
    obs.off('SceneNameChanged', handleSceneNameChanged)
    obs.off('TransitionListChanged', handleTransitionListChanged)
  })

  $: if (programScene || previewScene) {
    getScreenshot()
  }

  // Named handlers (not inline arrow functions passed straight to obs.on)
  // so onDestroy can remove the exact same references via obs.off() - same
  // pattern already used in AudioMixer.svelte/SceneItemsPanel.svelte. This
  // component lives inside +page.svelte's `{#if connected}` block, so it's
  // destroyed and recreated on every disconnect/reconnect - without this
  // cleanup, every reconnect stacks another full set of listeners onto the
  // long-lived `obs` singleton, each one firing (redundantly, but not
  // harmlessly - see getScreenshot() above) on every subsequent event.
  function handleStudioModeStateChanged (data) {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data.studioModeEnabled
    if (isStudioMode) {
      previewScene = programScene
    }
  }

  function handleCurrentPreviewSceneChanged (data) {
    console.log('CurrentPreviewSceneChanged', data.sceneName)
    previewScene = data.sceneName
  }

  function handleCurrentProgramSceneChanged (data) {
    console.log('CurrentProgramSceneChanged', data.sceneName)
    programScene = data.sceneName
  }

  function handleSceneNameChanged (data) {
    if (data.oldSceneName === programScene) programScene = data.sceneName
    if (data.oldSceneName === previewScene) previewScene = data.sceneName
  }

  // TODO: does not exist???
  function handleTransitionListChanged (data) {
    console.log('TransitionListChanged', data)
    transitions = data.transitions || []
  }

  obs.on('StudioModeStateChanged', handleStudioModeStateChanged)
  obs.on('CurrentPreviewSceneChanged', handleCurrentPreviewSceneChanged)
  obs.on('CurrentProgramSceneChanged', handleCurrentProgramSceneChanged)
  obs.on('SceneNameChanged', handleSceneNameChanged)
  obs.on('TransitionListChanged', handleTransitionListChanged)

  // Guards against unbounded overlapping calls: getScreenshot() is driven
  // by both a 1s setInterval AND the reactive statement below (which
  // re-fires on every programScene/previewScene change, e.g. every time a
  // preview scene gets picked). Each call awaits up to two sequential
  // GetSourceScreenshot round-trips - once Studio Mode is on and a
  // different preview scene is selected, that's roughly double the
  // per-call latency of the single-scene case. Without this guard, a slow
  // call (OBS busy rendering/encoding while also streaming, or just normal
  // network latency) could still be in flight when the next interval tick
  // - or several rapid preview-scene picks - fire more calls on top of it;
  // with no ordering guarantee on which response lands last, an older,
  // slower response could overwrite a newer image with a stale one, and
  // under sustained overlap this can make the image appear to stop
  // updating rather than just occasionally flicker. `screenshotPending`
  // coalesces any calls that arrive while one's already running into a
  // single extra pass immediately after, instead of just dropping them (so
  // a rapid preview-scene switch never has to wait a full 1s for the next
  // interval tick to catch up).
  let screenshotInFlight = false
  let screenshotPending = false

  async function getScreenshot () {
    if (!programScene) return
    if (screenshotInFlight) {
      screenshotPending = true
      return
    }
    screenshotInFlight = true
    try {
      do {
        screenshotPending = false

        // Fetched in parallel (not sequentially) - halves the per-call
        // latency whenever both are needed, making overlap less likely in
        // the first place. previewScene is only fetched separately when it
        // actually differs from programScene (and is set at all) - same
        // "reuse the program frame for an identical preview" optimization
        // as before, now via wantsPreview instead of reassigning a shared
        // `data` variable.
        const wantsPreview = isStudioMode && previewScene && previewScene !== programScene
        const [programData, previewData] = await Promise.all([
          sendCommand('GetSourceScreenshot', {
            sourceName: programScene,
            imageFormat,
            imageWidth: 960,
            imageHeight: 540
          }),
          wantsPreview
            ? sendCommand('GetSourceScreenshot', {
              sourceName: previewScene,
              imageFormat,
              imageWidth: 960,
              imageHeight: 540
            })
            : Promise.resolve(null)
        ])

        if (programData && programData.imageData && program) {
          program.src = programData.imageData
          program.className = ''
        }

        if (isStudioMode) {
          const activePreviewData = wantsPreview ? previewData : programData
          if (activePreviewData && activePreviewData.imageData && preview) {
            preview.src = activePreviewData.imageData
          }
        }
      } while (screenshotPending)
    } finally {
      screenshotInFlight = false
    }
  }
</script>

<div class="columns is-centered is-vcentered has-text-centered">
  {#if isStudioMode}
    <div class="column">
      <div class="preview-pane">
        <div class="pane-label pane-label-preview">Preview</div>
        <img bind:this={preview} class="has-background-dark pane-image pane-image-preview" alt="Preview" />
      </div>
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
    <div class="column">
      <div class="program-pane">
        <div class="pane-label pane-label-program">Program (Live)</div>
        <img bind:this={program} class="pane-image pane-image-program" alt="Program" />
      </div>
    </div>
  {:else}
    <div class="column">
      <img bind:this={program} alt="Program"/>
    </div>
  {/if}
</div>

<style>
  .pane-label {
    border-radius: 4px 4px 0 0;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 0.35rem 0;
    text-transform: uppercase;
  }
  .pane-label-preview {
    background: hsl(140, 70%, 33%);
    color: white;
  }
  .pane-label-program {
    background: hsl(0, 75%, 45%);
    color: white;
  }
  .pane-image {
    display: block;
    width: 100%;
  }
  .pane-image-preview {
    border: 3px solid hsl(140, 70%, 33%);
    border-radius: 0 0 4px 4px;
    border-top: none;
  }
  .pane-image-program {
    border: 3px solid hsl(0, 75%, 45%);
    border-radius: 0 0 4px 4px;
    border-top: none;
  }
</style>
