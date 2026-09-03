<script>
  import { onDestroy, onMount } from 'svelte'
  import { mdiAlertOctagon } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { obs, sendCommand } from './obs.js'
  import { AUDIO_SOURCE_TYPE, MONITOR_TYPE_NONE, sumMasterLevels } from './obsAudio.js'
  import AudioMixerChannel from './AudioMixerChannel.svelte'
  import VuMeter from './VuMeter.svelte'

  let sceneName = ''
  let channels = []
  let loading = false
  let loadError = ''

  // obs-websocket has no way to tell us whether a source is *actually*
  // producing audio right now (OBS's own mixer additionally checks
  // obs_source_audio_active(), which isn't exposed over the protocol) - it
  // only tells us the source *type* is capable of audio. A source like a
  // Game Capture with "Capture Audio" turned off (or simply never
  // producing sound) will pass our probe and show here even though OBS's
  // own mixer never lists it. Since there's no protocol-level fix, this is
  // a manual, per-source opt-out - hidden names persist locally, the same
  // way scene icons/isSceneOnTop etc. already do in this app.
  let hiddenNames = new Set(
    JSON.parse(window.localStorage.getItem('audioMixerHiddenSources') || '[]')
  )
  let showHidden = false

  $: window.localStorage.setItem('audioMixerHiddenSources', JSON.stringify([...hiddenNames]))
  $: visibleChannels = channels.filter((c) => !hiddenNames.has(c.inputName))
  $: hiddenChannels = channels.filter((c) => hiddenNames.has(c.inputName))

  function hideChannel (inputName) {
    hiddenNames.add(inputName)
    hiddenNames = hiddenNames
  }

  function unhideChannel (inputName) {
    hiddenNames.delete(inputName)
    hiddenNames = hiddenNames
  }

  // Panic button: mute (or unmute) every known audio source at once,
  // including ones the user has hidden from the mixer view - hiding a
  // channel only opts it out of the UI, it's still a live OBS source, and a
  // panic control should reach it regardless. Toggles direction based on
  // current state: if everything's already muted, the button flips to
  // "Unmute All" instead of doing nothing.
  $: allMuted = channels.length > 0 && channels.every((c) => c.inputMuted)

  function togglePanic () {
    const targetMuted = !allMuted
    for (const channel of channels) {
      sendCommand('SetInputMute', { inputName: channel.inputName, inputMuted: targetMuted })
    }
  }

  // Raw meter data lands here (mutated in place, not reactive) every ~50ms.
  // A pending requestAnimationFrame copies it into `renderedLevels` (a fresh
  // object, so Svelte picks up the change) at most once per paint, so the
  // high-volume InputVolumeMeters event never drives DOM writes directly.
  const latestLevels = {}
  let renderedLevels = {}
  let rafHandle = null
  let displayedNames = new Set()

  $: displayedNames = new Set(channels.map((c) => c.inputName))
  // Clearing synchronously (before the async refresh resolves) closes the
  // window where a scene switch would otherwise leave the *previous*
  // scene's rows rendered and interactive - a tap landing in that window
  // would mute or re-fade a source that isn't in the scene the user is now
  // looking at, and the panic button (which iterates `channels`) would act
  // on the stale set. Everything here is addressed by inputName, which is
  // globally unique, so unlike SceneItemsPanel there's no id-reuse hazard -
  // just commands aimed at the wrong, no-longer-visible scene.
  $: {
    channels = []
    if (sceneName) refreshChannels(sceneName)
  }

  onMount(async () => {
    const data = await sendCommand('GetCurrentProgramScene')
    sceneName = data.currentProgramSceneName || ''
  })

  // GetInputList/GetSceneItemList don't say which inputs carry audio, so we
  // probe with GetInputMute (obs-websocket rejects it for non-audio inputs)
  // and treat a successful response as "this is an audio source". Uses
  // obs.call() directly (not sendCommand) so a "not audio" rejection - an
  // expected, routine classification result here, not an error - doesn't
  // get logged as one.
  async function probeAudioCapability (inputName) {
    try {
      const result = await obs.call('GetInputMute', { inputName })
      return typeof result.inputMuted === 'boolean'
    } catch {
      return false
    }
  }

  // Guards against a slow/older refreshChannels() call (e.g. triggered by a
  // scene switch) resolving *after* a newer one and clobbering `channels`
  // with stale data - only the call holding the current token is allowed
  // to commit its result.
  let refreshToken = 0

  async function refreshChannels (name) {
    const token = ++refreshToken
    loading = true
    loadError = ''
    try {
      const [sceneData, specialData, inputListData] = await Promise.all([
        sendCommand('GetSceneItemList', { sceneName: name }),
        sendCommand('GetSpecialInputs'),
        sendCommand('GetInputList')
      ])

      const nameToUuid = new Map(
        (inputListData.inputs || []).map((input) => [input.inputName, input.inputUuid])
      )

      const seenUuids = new Set()
      const candidates = []

      // Global devices (Desktop Audio, Mic/Aux, ...) mix into the output
      // regardless of which scene is active, so they're never scene items -
      // GetSceneItemList alone would never surface them. Listed first, so
      // they consistently appear before the current scene's own sources.
      const specialNames = Object.values(specialData || {}).filter(
        (n) => typeof n === 'string' && n.length > 0
      )
      for (const inputName of specialNames) {
        const inputUuid = nameToUuid.get(inputName)
        if (inputUuid && !seenUuids.has(inputUuid)) {
          seenUuids.add(inputUuid)
          candidates.push({ inputName, inputUuid, isGlobal: true })
        }
      }

      const items = sceneData.sceneItems || []
      for (const item of items) {
        if (item.sourceType !== AUDIO_SOURCE_TYPE) continue
        if (seenUuids.has(item.sourceUuid)) continue
        seenUuids.add(item.sourceUuid)
        candidates.push({ inputName: item.sourceName, inputUuid: item.sourceUuid, isGlobal: false })
      }

      const isAudio = await Promise.all(
        candidates.map((item) => probeAudioCapability(item.inputName))
      )
      const audioItems = candidates.filter((_, i) => isAudio[i])

      // Fetch OBS's actual current volume/mute/monitor state for every
      // audio source - this becomes the fader's starting position. Nothing
      // here ever calls SetInputVolume/SetInputMute/SetInputAudioMonitorType.
      const states = await Promise.all(
        audioItems.map(async (item) => {
          const [volume, mute, monitor] = await Promise.all([
            sendCommand('GetInputVolume', { inputName: item.inputName }),
            sendCommand('GetInputMute', { inputName: item.inputName }),
            sendCommand('GetInputAudioMonitorType', { inputName: item.inputName })
          ])
          return {
            inputName: item.inputName,
            inputUuid: item.inputUuid,
            isGlobal: item.isGlobal,
            volumeDb: typeof volume.inputVolumeDb === 'number' ? volume.inputVolumeDb : 0,
            inputMuted: !!mute.inputMuted,
            monitorType: monitor.monitorType || MONITOR_TYPE_NONE
          }
        })
      )

      if (token !== refreshToken) return // superseded by a newer refresh - discard
      channels = states
    } catch (e) {
      if (token !== refreshToken) return
      loadError = e.message || 'Could not load audio sources for this scene.'
      channels = []
    } finally {
      if (token === refreshToken) loading = false
    }
  }

  // Approximate "is the combined mix clipping" meter, shown pinned to the
  // right of the (horizontally scrolling) channel strip - see
  // sumMasterLevels() in obsAudio.js for what this does and doesn't model.
  // Sums every known channel (not just visibleChannels - a hidden channel
  // is still real, live audio), so it recomputes whenever renderedLevels'
  // rAF-throttled flush lands, same cadence as the per-channel meters.
  $: masterLevels = sumMasterLevels(channels.map((c) => c.inputName), renderedLevels)

  function scheduleLevelsFlush () {
    if (rafHandle !== null) return
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null
      renderedLevels = { ...latestLevels }
    })
  }

  // Named handlers (not inline arrow functions passed straight to obs.on)
  // so onDestroy can remove the exact same references via obs.off(). This
  // component is inside +page.svelte's `{#if connected}` block, so it's
  // destroyed and recreated on every disconnect/reconnect - without this
  // cleanup, every reconnect would stack another full set of listeners on
  // the long-lived `obs` singleton, including one more InputVolumeMeters
  // handler (a ~20/sec event) each time.
  function handleCurrentProgramSceneChanged (data) {
    sceneName = data.sceneName || ''
  }

  function handleSceneItemCreated (data) {
    if (data.sceneName === sceneName) refreshChannels(sceneName)
  }

  function handleSceneItemRemoved (data) {
    if (data.sceneName === sceneName) refreshChannels(sceneName)
  }

  function handleSceneItemListReindexed (data) {
    if (data.sceneName === sceneName) refreshChannels(sceneName)
  }

  function handleInputMuteStateChanged (data) {
    const channel = channels.find((c) => c.inputName === data.inputName)
    if (channel) {
      channel.inputMuted = data.inputMuted
      channels = channels
    }
  }

  function handleInputVolumeChanged (data) {
    const channel = channels.find((c) => c.inputName === data.inputName)
    if (channel) {
      channel.volumeDb = data.inputVolumeDb
      channels = channels
    }
  }

  function handleInputNameChanged (data) {
    const channel = channels.find((c) => c.inputUuid === data.inputUuid)
    if (channel) {
      channel.inputName = data.inputName
      channels = channels
    }
  }

  function handleInputAudioMonitorTypeChanged (data) {
    const channel = channels.find((c) => c.inputName === data.inputName)
    if (channel) {
      channel.monitorType = data.monitorType
      channels = channels
    }
  }

  // High-volume event (~50ms interval) - must be requested explicitly via
  // eventSubscriptions on connect (see obs.js/OBS_EVENT_SUBSCRIPTIONS).
  function handleInputVolumeMeters (data) {
    if (!data || !data.inputs || displayedNames.size === 0) return
    let changed = false
    for (const input of data.inputs) {
      if (displayedNames.has(input.inputName)) {
        latestLevels[input.inputName] = input.inputLevelsMul
        changed = true
      }
    }
    if (changed) scheduleLevelsFlush()
  }

  obs.on('CurrentProgramSceneChanged', handleCurrentProgramSceneChanged)
  obs.on('SceneItemCreated', handleSceneItemCreated)
  obs.on('SceneItemRemoved', handleSceneItemRemoved)
  obs.on('SceneItemListReindexed', handleSceneItemListReindexed)
  obs.on('InputMuteStateChanged', handleInputMuteStateChanged)
  obs.on('InputVolumeChanged', handleInputVolumeChanged)
  obs.on('InputNameChanged', handleInputNameChanged)
  obs.on('InputAudioMonitorTypeChanged', handleInputAudioMonitorTypeChanged)
  obs.on('InputVolumeMeters', handleInputVolumeMeters)

  onDestroy(() => {
    if (rafHandle !== null) cancelAnimationFrame(rafHandle)
    obs.off('CurrentProgramSceneChanged', handleCurrentProgramSceneChanged)
    obs.off('SceneItemCreated', handleSceneItemCreated)
    obs.off('SceneItemRemoved', handleSceneItemRemoved)
    obs.off('SceneItemListReindexed', handleSceneItemListReindexed)
    obs.off('InputMuteStateChanged', handleInputMuteStateChanged)
    obs.off('InputVolumeChanged', handleInputVolumeChanged)
    obs.off('InputNameChanged', handleInputNameChanged)
    obs.off('InputAudioMonitorTypeChanged', handleInputAudioMonitorTypeChanged)
    obs.off('InputVolumeMeters', handleInputVolumeMeters)
  })
</script>

<section class="audio-mixer">
  <div class="audio-mixer-heading">
    <div class="audio-mixer-heading-top">
      <h2 class="title is-5">Audio Mixer</h2>
      <button
        type="button"
        class="button is-small audio-mixer-panic"
        class:is-danger={!allMuted}
        class:is-warning={allMuted}
        on:click={togglePanic}
        disabled={channels.length === 0}
        title={allMuted ? 'Unmute all audio sources' : 'Mute all audio sources'}
      >
        <span class="icon">
          <Icon path={mdiAlertOctagon} size={0.85} />
        </span>
        <span>{allMuted ? 'Unmute All' : 'Panic: Mute All'}</span>
      </button>
    </div>
    <p class="subtitle is-6">
      Volume and mute for the audio sources in the current scene{sceneName ? ` (“${sceneName}”)` : ''},
      plus your global audio devices (Desktop Audio, Mic/Aux).
    </p>
  </div>

  {#if loading && channels.length === 0}
    <p class="has-text-grey">Loading audio sources…</p>
  {:else if loadError}
    <p class="has-text-danger">{loadError}</p>
  {:else if channels.length === 0}
    <p class="has-text-grey">No audio sources found in this scene.</p>
  {:else if visibleChannels.length === 0}
    <p class="has-text-grey">All audio sources in this scene are hidden.</p>
  {:else}
    <div class="audio-mixer-row">
      <div class="audio-mixer-channels">
        {#each visibleChannels as channel (channel.inputUuid)}
          <AudioMixerChannel
            inputName={channel.inputName}
            volumeDb={channel.volumeDb}
            inputMuted={channel.inputMuted}
            isGlobal={channel.isGlobal}
            monitorType={channel.monitorType}
            levels={renderedLevels[channel.inputName]}
            on:hide={() => hideChannel(channel.inputName)}
          />
        {/each}
      </div>
      <div class="audio-mixer-master" title="Approximate combined mix level - not exact, and not adjustable here.">
        <span class="audio-mixer-master-label">Mix</span>
        <div class="audio-mixer-master-meter">
          <VuMeter levels={masterLevels} />
        </div>
      </div>
    </div>
  {/if}

  {#if hiddenChannels.length > 0}
    <div class="audio-mixer-hidden">
      <button type="button" class="audio-mixer-hidden-toggle" on:click={() => (showHidden = !showHidden)}>
        {showHidden ? 'Hide' : 'Show'} {hiddenChannels.length} hidden source{hiddenChannels.length === 1 ? '' : 's'}
      </button>
      {#if showHidden}
        <ul class="audio-mixer-hidden-list">
          {#each hiddenChannels as channel (channel.inputUuid)}
            <li>
              <span>{channel.inputName}</span>
              <button type="button" class="button is-small" on:click={() => unhideChannel(channel.inputName)}>
                Show in mixer
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</section>

<style>
  .audio-mixer {
    margin-bottom: 2rem;
  }
  .audio-mixer-heading {
    margin-bottom: 1rem;
  }
  .audio-mixer-heading-top {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
  }
  .audio-mixer-panic {
    flex-shrink: 0;
  }
  /* Channel strip + the pinned master meter side by side - the meter stays
     put (flex-shrink: 0) while only the channel strip itself scrolls, so
     it's still visible ("always shown") no matter how far the user has
     scrolled through a long channel list. */
  .audio-mixer-row {
    display: flex;
    gap: 0.6rem;
  }
  /* A horizontal strip, like a real mixer's channel row - once there are
     more channels than fit, it scrolls sideways instead of wrapping to a
     new row (which would keep eating vertical space as sources are added,
     and push controls further down / off-screen). */
  .audio-mixer-channels {
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex: 1;
    gap: 0.6rem;
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding-bottom: 0.6rem; /* room for the scrollbar so it doesn't sit on top of the faders */
    scrollbar-width: thin;
  }
  .audio-mixer-master {
    align-items: center;
    background: hsl(220, 15%, 14%);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.4rem;
    padding: 0.6rem;
  }
  .audio-mixer-master-label {
    color: hsl(220, 10%, 65%);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  /* Fixed height so VuMeter's internal height:100% chain (bars use flex:1
     inside a column that's sized off this) has a definite ancestor height
     to resolve against - matches .mixer-channel-body's meter height in
     AudioMixerChannel.svelte so the two visually line up. */
  .audio-mixer-master-meter {
    height: 11rem;
  }
  .audio-mixer-hidden {
    margin-top: 0.75rem;
  }
  .audio-mixer-hidden-toggle {
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: none;
    color: hsl(220, 10%, 60%);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.4rem 0;
    text-decoration: underline;
  }
  .audio-mixer-hidden-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.4rem;
  }
  .audio-mixer-hidden-list li {
    align-items: center;
    background: hsl(220, 15%, 14%);
    border-radius: 8px;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
  }
</style>
