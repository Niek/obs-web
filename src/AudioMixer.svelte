<script>
  import { onDestroy } from 'svelte'
  import { mdiAlertOctagon } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { obs, sendCommand } from './obs.js'
  import { MONITOR_TYPE_NONE, sumMasterLevels } from './obsAudio.js'
  import AudioMixerChannel from './AudioMixerChannel.svelte'
  import VuMeter from './VuMeter.svelte'

  // Which channels exist is driven entirely by the InputVolumeMeters event,
  // not by walking the current scene's items. obs-websocket keeps a meter
  // for every input that has OBS_SOURCE_AUDIO and is currently active
  // (obs_source_active - i.e. part of the program output), adding/removing
  // them on source_activate/source_deactivate. That's the same set OBS's own
  // mixer starts from, and it already covers everything a scene walk would
  // have to handle by hand: sources nested inside groups or nested scenes,
  // global devices (Desktop Audio, Mic/Aux, ...), and hidden scene items
  // (left out, since they're inactive). A source that appears in the meters
  // gets its volume/mute/monitor state fetched once and becomes a channel;
  // one that stops appearing for REMOVE_AFTER_MS is dropped.
  let channels = []
  let ready = false // first InputVolumeMeters batch seen (or gave up waiting)

  // Grace period before dropping a channel whose meter stopped reporting -
  // long enough to ride out a source briefly deactivating and reactivating
  // (e.g. during a scene transition) without the strip flickering.
  const REMOVE_AFTER_MS = 1000
  // If fetching a new channel's initial state fails, wait this long before
  // retrying instead of re-requesting on every ~50ms meter tick.
  const RETRY_AFTER_MS = 5000

  const lastSeen = new Map() // inputName -> timestamp of last meter batch it appeared in
  const pendingNames = new Set() // initial state fetch in flight
  const failedAt = new Map() // inputName -> timestamp of last failed initial state fetch

  // Global devices get a "Global" badge and are listed first. Only used for
  // presentation - they show up in the meters like any other active input.
  let specialNames = new Set()

  async function refreshSpecialInputs () {
    const data = await sendCommand('GetSpecialInputs')
    specialNames = new Set(
      Object.values(data || {}).filter((n) => typeof n === 'string' && n.length > 0)
    )
  }
  refreshSpecialInputs()

  // obs-websocket has no way to tell us whether a source is *actually*
  // producing audio right now (OBS's own mixer additionally checks
  // obs_source_audio_active(), which isn't exposed over the protocol) - it
  // only tells us the source *type* is capable of audio. A source like a
  // Browser Source without "Control audio via OBS", or a Game Capture with
  // "Capture Audio" turned off, still gets a meter and shows here even though
  // OBS's own mixer never lists it. Since there's no protocol-level fix, this
  // is a manual, per-source opt-out - hidden names persist locally, the same
  // way scene icons/isSceneOnTop etc. already do in this app.
  let hiddenNames = new Set(
    JSON.parse(window.localStorage.getItem('audioMixerHiddenSources') || '[]')
  )
  let showHidden = false

  // Stable sort: global devices first, everything else in the order it
  // first appeared in the meters.
  $: sortedChannels = channels
    .slice()
    .sort((a, b) => Number(specialNames.has(b.inputName)) - Number(specialNames.has(a.inputName)))
  $: window.localStorage.setItem('audioMixerHiddenSources', JSON.stringify([...hiddenNames]))
  $: visibleChannels = sortedChannels.filter((c) => !hiddenNames.has(c.inputName))
  $: hiddenChannels = sortedChannels.filter((c) => hiddenNames.has(c.inputName))

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

  // Should the meters never arrive (e.g. nothing at all is active), stop
  // showing "waiting" and fall through to the empty state.
  const readyTimeout = setTimeout(() => { ready = true }, 1500)

  // Fetch OBS's actual current volume/mute/monitor state for a newly seen
  // audio source - this becomes the fader's starting position. Nothing here
  // ever calls SetInputVolume/SetInputMute/SetInputAudioMonitorType. Uses
  // obs.call() so a failure (e.g. the input was removed in the meantime) can
  // be told apart from a real response instead of defaulting to 0dB.
  async function addChannel (inputName, inputUuid) {
    pendingNames.add(inputName)
    try {
      const [volume, mute, monitor] = await Promise.all([
        obs.call('GetInputVolume', { inputName }),
        obs.call('GetInputMute', { inputName }),
        obs.call('GetInputAudioMonitorType', { inputName })
      ])
      // Gone again (or renamed) while we were fetching - let the next meter
      // batch it shows up in decide.
      const seen = lastSeen.get(inputName)
      if (seen === undefined || performance.now() - seen > REMOVE_AFTER_MS) return
      if (channels.some((c) => c.inputName === inputName)) return
      failedAt.delete(inputName)
      channels = [...channels, {
        inputName,
        inputUuid: inputUuid || inputName,
        volumeDb: typeof volume.inputVolumeDb === 'number' ? volume.inputVolumeDb : 0,
        inputMuted: !!mute.inputMuted,
        monitorType: monitor.monitorType || MONITOR_TYPE_NONE
      }]
    } catch (e) {
      console.log('Could not load audio state for', inputName, '- error is:', e.message)
      failedAt.set(inputName, performance.now())
    } finally {
      pendingNames.delete(inputName)
    }
  }

  function removeChannel (inputName) {
    channels = channels.filter((c) => c.inputName !== inputName)
    delete latestLevels[inputName]
    lastSeen.delete(inputName)
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

  // Everything here is keyed by inputName (that's what the meters report),
  // so a rename has to carry the channel's bookkeeping over to the new name
  // - otherwise the old-named channel would look inactive and get dropped
  // while a duplicate is fetched for the new name.
  function handleInputNameChanged (data) {
    const channel = channels.find((c) => c.inputName === data.oldInputName)
    if (channel) {
      channel.inputName = data.inputName
      channels = channels
    }
    if (data.oldInputName in latestLevels) {
      latestLevels[data.inputName] = latestLevels[data.oldInputName]
      delete latestLevels[data.oldInputName]
    }
    if (lastSeen.has(data.oldInputName)) {
      lastSeen.set(data.inputName, lastSeen.get(data.oldInputName))
      lastSeen.delete(data.oldInputName)
    }
    if (specialNames.has(data.oldInputName)) refreshSpecialInputs()
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
  // Drives both the levels and which channels exist (see top of file).
  function handleInputVolumeMeters (data) {
    if (!data || !data.inputs) return
    ready = true
    const now = performance.now()
    const displayed = new Set(channels.map((c) => c.inputName))
    const presentNames = new Set()
    let changed = false
    for (const input of data.inputs) {
      const name = input.inputName
      if (!name) continue
      presentNames.add(name)
      lastSeen.set(name, now)
      if (displayed.has(name)) {
        latestLevels[name] = input.inputLevelsMul
        changed = true
      } else if (!pendingNames.has(name) && !(now - (failedAt.get(name) ?? -Infinity) < RETRY_AFTER_MS)) {
        addChannel(name, input.inputUuid)
      }
    }
    // A displayed channel missing from this batch has gone inactive, so its
    // last level must be cleared instead of left frozen at a stale non-zero
    // value. Deleting (rather than zeroing) falls back to the same "no levels
    // yet" treatment VuMeter/sumMasterLevels already give a channel with no
    // InputVolumeMeters data at all. If it stays gone past the grace period,
    // the channel itself goes.
    for (const name of displayed) {
      if (presentNames.has(name)) continue
      if (name in latestLevels) {
        delete latestLevels[name]
        changed = true
      }
      if (now - (lastSeen.get(name) ?? 0) > REMOVE_AFTER_MS) {
        removeChannel(name)
        changed = true
      }
    }
    if (changed) scheduleLevelsFlush()
  }

  obs.on('InputMuteStateChanged', handleInputMuteStateChanged)
  obs.on('InputVolumeChanged', handleInputVolumeChanged)
  obs.on('InputNameChanged', handleInputNameChanged)
  obs.on('InputAudioMonitorTypeChanged', handleInputAudioMonitorTypeChanged)
  obs.on('InputVolumeMeters', handleInputVolumeMeters)

  onDestroy(() => {
    clearTimeout(readyTimeout)
    if (rafHandle !== null) cancelAnimationFrame(rafHandle)
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
      Volume and mute for every audio source that's currently live on the program output
      (including sources inside groups and nested scenes), plus your global audio devices (Desktop Audio, Mic/Aux).
    </p>
  </div>

  {#if !ready && channels.length === 0}
    <p class="has-text-grey">Loading audio sources…</p>
  {:else if channels.length === 0}
    <p class="has-text-grey">No live audio sources found.</p>
  {:else if visibleChannels.length === 0}
    <p class="has-text-grey">All live audio sources are hidden.</p>
  {:else}
    <div class="audio-mixer-row">
      <div class="audio-mixer-channels">
        {#each visibleChannels as channel (channel.inputUuid)}
          <AudioMixerChannel
            inputName={channel.inputName}
            volumeDb={channel.volumeDb}
            inputMuted={channel.inputMuted}
            isGlobal={specialNames.has(channel.inputName)}
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
