<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { mdiClose, mdiEye, mdiEyeOff } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { obs, sendCommand } from './obs.js'

  export let open = false
  export let mode = 'program' // 'program' (live/Program scene) or 'preview' (Studio Mode's Preview scene)
  export let side = 'right' // which screen edge the drawer slides in from: 'left' or 'right'

  const dispatch = createEventDispatcher()

  // Which "get current scene" call and "scene changed" event this instance
  // tracks - fixed for the component's lifetime, since a single instance is
  // always dedicated to one mode (see +page.svelte, which mounts one
  // instance per mode rather than switching an existing instance's mode).
  const sceneChangedEvent = mode === 'preview' ? 'CurrentPreviewSceneChanged' : 'CurrentProgramSceneChanged'

  let sceneName = ''
  let items = []
  let loading = false
  let loadError = ''

  // Only top-level scene items - same v1 scope decision as the audio mixer
  // (AudioMixer.svelte): items nested inside groups aren't recursively
  // enumerated. GetSceneItemList already returns items in their actual
  // z-order (front-most last), matched here by sorting on sceneItemIndex
  // rather than relying on response order being guaranteed.
  let refreshToken = 0

  async function refreshItems (name) {
    const token = ++refreshToken
    loading = true
    loadError = ''
    try {
      const data = await sendCommand('GetSceneItemList', { sceneName: name })
      if (token !== refreshToken) return // superseded by a newer refresh - discard
      items = (data.sceneItems || [])
        .slice()
        .sort((a, b) => a.sceneItemIndex - b.sceneItemIndex)
        .map((item) => ({
          sceneItemId: item.sceneItemId,
          sourceName: item.sourceName,
          sceneItemEnabled: !!item.sceneItemEnabled
        }))
    } catch (e) {
      if (token !== refreshToken) return
      loadError = e.message || 'Could not load scene items.'
      items = []
    } finally {
      if (token === refreshToken) loading = false
    }
  }

  $: if (sceneName) {
    refreshItems(sceneName)
  } else {
    items = []
  }

  onMount(async () => {
    // GetCurrentPreviewScene only makes sense while Studio Mode is on; the
    // 'preview' instance is only ever mounted by +page.svelte while
    // isStudioMode is true, so this doesn't need its own Studio-Mode check -
    // sendCommand() already swallows/logs a failure and returns {}, which
    // just leaves sceneName empty in the (currently unreachable) case where
    // it's called outside Studio Mode.
    const data = mode === 'preview'
      ? await sendCommand('GetCurrentPreviewScene')
      : await sendCommand('GetCurrentProgramScene')
    sceneName = (mode === 'preview' ? data.currentPreviewSceneName : data.currentProgramSceneName) || ''
  })

  function toggleItem (item) {
    sendCommand('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: !item.sceneItemEnabled
    })
  }

  function close () {
    dispatch('close')
  }

  // Named handlers (not inline arrow functions) so onDestroy can remove the
  // exact same references via obs.off() - same reasoning as AudioMixer.svelte:
  // this component lives inside +page.svelte's `{#if connected}` block, so
  // it's destroyed and recreated on every disconnect/reconnect, and without
  // cleanup every reconnect would stack another set of listeners onto the
  // long-lived `obs` singleton.
  function handleSceneChanged (data) {
    sceneName = data.sceneName || ''
  }

  function handleSceneItemCreated (data) {
    if (data.sceneName === sceneName) refreshItems(sceneName)
  }

  function handleSceneItemRemoved (data) {
    if (data.sceneName === sceneName) refreshItems(sceneName)
  }

  function handleSceneItemListReindexed (data) {
    if (data.sceneName === sceneName) refreshItems(sceneName)
  }

  function handleSceneItemEnableStateChanged (data) {
    if (data.sceneName !== sceneName) return
    const item = items.find((i) => i.sceneItemId === data.sceneItemId)
    if (item) {
      item.sceneItemEnabled = data.sceneItemEnabled
      items = items
    }
  }

  obs.on(sceneChangedEvent, handleSceneChanged)
  obs.on('SceneItemCreated', handleSceneItemCreated)
  obs.on('SceneItemRemoved', handleSceneItemRemoved)
  obs.on('SceneItemListReindexed', handleSceneItemListReindexed)
  obs.on('SceneItemEnableStateChanged', handleSceneItemEnableStateChanged)

  onDestroy(() => {
    obs.off(sceneChangedEvent, handleSceneChanged)
    obs.off('SceneItemCreated', handleSceneItemCreated)
    obs.off('SceneItemRemoved', handleSceneItemRemoved)
    obs.off('SceneItemListReindexed', handleSceneItemListReindexed)
    obs.off('SceneItemEnableStateChanged', handleSceneItemEnableStateChanged)
  })
</script>

<div
  class="scene-items-scrim"
  class:is-open={open}
  on:click={close}
  aria-hidden="true"
></div>

<aside
  class="scene-items-panel"
  class:is-open={open}
  class:from-left={side === 'left'}
  class:from-right={side !== 'left'}
  aria-label="Scene items"
  aria-hidden={!open}
>
  <div class="scene-items-header">
    <div class="scene-items-banner" class:is-live={mode !== 'preview'} class:is-preview={mode === 'preview'}>
      <span class="scene-items-banner-label">{mode === 'preview' ? 'Preview' : 'Live'}</span>
      <button
        type="button"
        class="scene-items-close"
        on:click={close}
        title="Close"
        aria-label="Close scene items panel"
      >
        <Icon path={mdiClose} size={0.9} />
      </button>
    </div>
    <!-- A separate, wrapping line rather than appending the scene name to
         the title above - a long scene name in a single-line flex header
         (next to the close button) pushed content past the panel's edge
         instead of truncating cleanly. -->
    {#if sceneName}
      <p class="scene-items-scene-name">{sceneName}</p>
    {/if}
  </div>

  <div class="scene-items-body">
    {#if loading && items.length === 0}
      <p class="has-text-grey">Loading…</p>
    {:else if loadError}
      <p class="has-text-danger">{loadError}</p>
    {:else if items.length === 0}
      <p class="has-text-grey">No items in this scene.</p>
    {:else}
      <ul class="scene-items-list">
        {#each items as item (item.sceneItemId)}
          <li class="scene-items-item" class:is-inactive={!item.sceneItemEnabled}>
            <span class="scene-items-name" title={item.sourceName}>{item.sourceName}</span>
            <button
              type="button"
              class="scene-items-eye"
              class:is-active={item.sceneItemEnabled}
              on:click={() => toggleItem(item)}
              aria-pressed={item.sceneItemEnabled}
              title={item.sceneItemEnabled ? 'Hide' : 'Show'}
              aria-label="{item.sceneItemEnabled ? 'Hide' : 'Show'} {item.sourceName}"
            >
              <Icon path={item.sceneItemEnabled ? mdiEye : mdiEyeOff} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</aside>

<style>
  .scene-items-scrim {
    background: rgba(0, 0, 0, 0.5);
    inset: 0;
    opacity: 0;
    pointer-events: none;
    position: fixed;
    transition: opacity 200ms ease;
    z-index: 39;
  }
  .scene-items-scrim.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .scene-items-panel {
    background: hsl(220, 15%, 12%);
    bottom: 0;
    display: flex;
    flex-direction: column;
    max-width: 85vw;
    position: fixed;
    top: 0;
    transition: transform 220ms ease;
    width: 18rem;
    z-index: 40;
  }
  .scene-items-panel.from-left {
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.45);
    left: 0;
    transform: translateX(-100%);
  }
  .scene-items-panel.from-right {
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.45);
    right: 0;
    transform: translateX(100%);
  }
  .scene-items-panel.is-open {
    transform: translateX(0);
  }
  .scene-items-header {
    border-bottom: 1px solid hsl(220, 15%, 22%);
  }
  /* Same colored-strip convention as ProgramPreview.svelte's pane labels
     (Round 8: green "Preview" / red "Program (Live)") and the navbar
     trigger buttons that open this panel (Round 12) - a "Bauchbinde" at the
     top of the drawer itself, per the user's request, so the color-coding
     carries all the way from the video pane through the trigger button into
     the panel that opens, and which panel you're looking at is unambiguous
     even without reading the text. */
  .scene-items-banner {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    padding: 0.55rem 0.6rem 0.55rem 1rem;
  }
  .scene-items-banner.is-live {
    background: hsl(0, 75%, 45%);
  }
  .scene-items-banner.is-preview {
    background: hsl(140, 70%, 33%);
  }
  .scene-items-banner-label {
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .scene-items-scene-name {
    color: hsl(220, 10%, 65%);
    font-size: 0.8rem;
    margin: 0;
    overflow-wrap: break-word;
    padding: 0.5rem 1rem 0.75rem;
  }
  .scene-items-close {
    align-items: center;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    height: 2rem;
    justify-content: center;
    padding: 0;
    width: 2rem;
  }
  .scene-items-body {
    overflow-y: auto;
    padding: 0.75rem;
  }
  .scene-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .scene-items-item {
    align-items: center;
    background: hsl(220, 15%, 17%);
    border-radius: 8px;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    padding: 0.55rem 0.6rem 0.55rem 0.9rem;
  }
  /* Named is-inactive, not is-hidden - Bulma (this app's CSS framework)
     defines a global `.is-hidden { display: none !important; }` utility
     class, which silently removed disabled scene items from the DOM
     entirely when this used that name (the bug the user reported: disabled
     items vanished from the list instead of just graying out - the
     obs-websocket data was always correct, GetSceneItemList confirmed live
     against the user's own OBS server to include disabled items just fine,
     this was purely a CSS class name collision on this app's side). */
  .scene-items-item.is-inactive {
    background: hsl(220, 15%, 13%);
    opacity: 0.5;
  }
  .scene-items-name {
    color: hsl(0, 0%, 92%);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .scene-items-item.is-inactive .scene-items-name {
    color: hsl(220, 10%, 55%);
  }
  .scene-items-eye {
    align-items: center;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: hsl(220, 10%, 55%);
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    height: 2rem;
    justify-content: center;
    padding: 0;
    width: 2rem;
  }
  .scene-items-eye.is-active {
    color: hsl(204, 86%, 62%);
  }
</style>
