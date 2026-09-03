<script>
  import { createEventDispatcher } from 'svelte'
  import { mdiEyeOff, mdiHeadphones, mdiHeadphonesOff, mdiVolumeHigh, mdiVolumeOff } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { sendCommand } from './obs.js'
  import { MAX_VOLUME_DB, MIN_VOLUME_DB, MONITOR_TYPE_MONITOR_AND_OUTPUT, MONITOR_TYPE_NONE } from './obsAudio.js'
  import VuMeter from './VuMeter.svelte'

  const dispatch = createEventDispatcher()

  export let inputName
  export let volumeDb = 0 // authoritative value from OBS (initial GetInputVolume, or a later change event)
  export let inputMuted = false
  export let isGlobal = false // true for a global device (Desktop Audio, Mic/Aux, ...), not a scene item
  export let monitorType = MONITOR_TYPE_NONE
  export let levels = null

  // Local, user-editable copy of the fader position. Only ever written to
  // OBS from onFaderInput/onFaderCommit, i.e. only in response to a real
  // user gesture on the slider - never from the initial load or from a
  // remote InputVolumeChanged event.
  let sliderValue = volumeDb
  let isEditing = false
  let lastSentAt = 0
  const SEND_INTERVAL_MS = 66 // ~15 updates/sec while dragging, to avoid flooding the websocket

  // Local, user-editable copy of the exact-dB text field. Same "don't let
  // remote updates fight the user's input" guard as the fader's isEditing,
  // but tracked separately since typing and dragging are independent
  // gestures that can't both own sliderValue's authoritative source at once.
  let dbInputValue = volumeDb.toFixed(1)
  let isEditingDb = false

  // Follow OBS's real state while the user isn't actively dragging the
  // fader or editing the exact-dB field. Once they touch either, remote/
  // echoed updates stop overwriting it until they finish, so neither
  // gesture fights incoming state.
  $: if (!isEditing && !isEditingDb) {
    sliderValue = volumeDb
  }
  $: if (!isEditingDb) {
    dbInputValue = sliderValue.toFixed(1)
  }

  function beginEdit () {
    isEditing = true
  }

  function resetVolume () {
    sliderValue = 0
    sendCommand('SetInputVolume', { inputName, inputVolumeDb: 0 })
  }

  // Double-tap-to-reset, detected from pointerdown timing rather than the
  // native `dblclick` event - dblclick's touch emulation on iOS/iPadOS
  // Safari is unreliable (this app is iPad-first), whereas pointerdown
  // already fires reliably for both mouse and touch (it's how beginEdit is
  // triggered too). preventDefault() on the second pointerdown suppresses
  // the range input's own default "jump thumb to touch position" behavior,
  // so the reset isn't briefly overwritten by whatever position the second
  // tap landed on.
  let lastFaderPointerDownAt = 0
  const DOUBLE_TAP_RESET_MS = 350

  function onFaderPointerDown (event) {
    const now = performance.now()
    if (now - lastFaderPointerDownAt < DOUBLE_TAP_RESET_MS) {
      lastFaderPointerDownAt = 0
      event.preventDefault()
      resetVolume()
      return
    }
    lastFaderPointerDownAt = now
    beginEdit()
  }

  function onFaderInput (event) {
    sliderValue = Number(event.target.value)
    const now = performance.now()
    if (now - lastSentAt >= SEND_INTERVAL_MS) {
      lastSentAt = now
      sendCommand('SetInputVolume', { inputName, inputVolumeDb: sliderValue })
    }
  }

  function onFaderCommit (event) {
    sliderValue = Number(event.target.value)
    sendCommand('SetInputVolume', { inputName, inputVolumeDb: sliderValue })
    isEditing = false
  }

  // If the drag gesture is interrupted (e.g. iOS/iPadOS cancels an
  // in-progress touch to hand it to a system gesture) the input never
  // fires `change`, so onFaderCommit never runs. Without this, isEditing
  // would stay stuck true forever, permanently blocking the reactive
  // sync back to the authoritative `volumeDb` prop (line 38) - the fader
  // would freeze at whatever it last showed even as real
  // InputVolumeChanged events keep arriving. Just release the lock and
  // don't send anything; the reactive statement re-syncs sliderValue
  // from volumeDb on its own once isEditing is false.
  function onFaderPointerCancel () {
    isEditing = false
    // Also clear the double-tap-reset timer: without this, a cancelled
    // gesture followed by a normal re-tap within DOUBLE_TAP_RESET_MS would
    // be misread as the second tap of a double-tap and slam the fader to
    // 0 dB - lastFaderPointerDownAt was never meant to survive a cancelled
    // gesture, only a completed one.
    lastFaderPointerDownAt = 0
  }

  function toggleMute () {
    sendCommand('SetInputMute', { inputName, inputMuted: !inputMuted })
  }

  // Deliberately only ever sets NONE or MONITOR_AND_OUTPUT - never
  // MONITOR_ONLY, which mutes the source out of the stream/recording while
  // it keeps playing locally, with nothing else in the UI (the mute button
  // stays showing "not muted") to reveal that it happened. See obsAudio.js.
  function toggleMonitor () {
    const next = monitorType === MONITOR_TYPE_MONITOR_AND_OUTPUT
      ? MONITOR_TYPE_NONE
      : MONITOR_TYPE_MONITOR_AND_OUTPUT
    sendCommand('SetInputAudioMonitorType', { inputName, monitorType: next })
  }

  function beginEditDb () {
    isEditingDb = true
  }

  // type="text"/inputmode="decimal" rather than type="number": iOS's numeric
  // keypad for type="number" doesn't reliably offer a minus-sign key, and
  // almost every value here is negative dB - manual parsing below stands in
  // for the browser-native number validation we'd otherwise get for free.
  function commitDbInput () {
    const parsed = Number.parseFloat(dbInputValue)
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(MAX_VOLUME_DB, Math.max(MIN_VOLUME_DB, parsed))
      sliderValue = clamped
      sendCommand('SetInputVolume', { inputName, inputVolumeDb: clamped })
    }
    isEditingDb = false
  }

  function onDbKeydown (event) {
    if (event.key === 'Enter') {
      event.target.blur() // triggers commitDbInput via on:blur
    } else if (event.key === 'Escape') {
      dbInputValue = sliderValue.toFixed(1)
      event.target.blur()
    }
  }
</script>

<div class="mixer-channel" class:is-muted={inputMuted}>
  <div class="mixer-channel-header">
    <div class="mixer-channel-header-top">
      {#if isGlobal}
        <span class="mixer-channel-global">Global</span>
      {/if}
      <div class="mixer-channel-header-actions">
        <button
          type="button"
          class="mixer-header-button"
          class:is-active={monitorType === MONITOR_TYPE_MONITOR_AND_OUTPUT}
          on:click={toggleMonitor}
          title={monitorType === MONITOR_TYPE_MONITOR_AND_OUTPUT ? 'Monitoring on (audible locally) - tap to turn off' : 'Monitoring off - tap to also hear this locally'}
          aria-pressed={monitorType === MONITOR_TYPE_MONITOR_AND_OUTPUT}
          aria-label="Toggle local monitoring for {inputName}"
        >
          <Icon path={monitorType === MONITOR_TYPE_MONITOR_AND_OUTPUT ? mdiHeadphones : mdiHeadphonesOff} size={0.75} />
        </button>
        <button
          type="button"
          class="mixer-header-button"
          on:click={() => dispatch('hide')}
          title="Hide this channel from the mixer"
          aria-label="Hide {inputName} from the mixer"
        >
          <Icon path={mdiEyeOff} size={0.75} />
        </button>
      </div>
    </div>
    <span class="mixer-channel-name" title={inputName}>{inputName}</span>
    <div class="mixer-channel-db">
      <input
        class="mixer-channel-db-input"
        type="text"
        inputmode="decimal"
        bind:value={dbInputValue}
        on:focus={beginEditDb}
        on:blur={commitDbInput}
        on:keydown={onDbKeydown}
        aria-label="Exact volume in dB for {inputName}"
      />
      <span class="mixer-channel-db-unit">dB</span>
    </div>
  </div>

  <div class="mixer-channel-body">
    <VuMeter {levels} muted={inputMuted} />

    <div class="mixer-fader-wrap">
      <input
        class="mixer-fader"
        type="range"
        min={MIN_VOLUME_DB}
        max={MAX_VOLUME_DB}
        step="0.5"
        value={sliderValue}
        on:pointerdown={onFaderPointerDown}
        on:input={onFaderInput}
        on:change={onFaderCommit}
        on:pointercancel={onFaderPointerCancel}
        aria-label="Volume for {inputName}"
        aria-valuetext="{sliderValue.toFixed(1)} dB"
        title="Double-tap or double-click to reset to 0 dB"
      />
    </div>
  </div>

  <button
    class="button mixer-mute-button"
    class:is-danger={inputMuted}
    class:is-success={!inputMuted}
    on:click={toggleMute}
    aria-pressed={inputMuted}
    title={inputMuted ? 'Unmute' : 'Mute'}
  >
    <span class="icon">
      <Icon path={inputMuted ? mdiVolumeOff : mdiVolumeHigh} />
    </span>
    <span>{inputMuted ? 'Unmute' : 'Mute'}</span>
  </button>
</div>

<style>
  .mixer-channel {
    background: hsl(220, 15%, 14%);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.5rem;
    padding: 0.6rem;
    width: 7rem;
  }
  .mixer-channel.is-muted {
    background: hsl(220, 15%, 10%);
  }
  .mixer-channel-header {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .mixer-channel-header-top {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 1.4rem;
  }
  .mixer-channel-global {
    color: hsl(204, 86%, 62%);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .mixer-channel-header-actions {
    align-items: center;
    display: flex;
    gap: 0.1rem;
    margin-left: auto;
    margin-right: -0.2rem;
  }
  .mixer-header-button {
    align-items: center;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: hsl(220, 10%, 55%);
    cursor: pointer;
    display: flex;
    height: 1.4rem;
    justify-content: center;
    padding: 0;
    width: 1.4rem;
  }
  .mixer-header-button.is-active {
    color: hsl(204, 86%, 62%);
  }
  .mixer-channel-name {
    font-size: 0.85rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mixer-channel-db {
    align-items: baseline;
    display: flex;
    gap: 0.25rem;
  }
  .mixer-channel-db-input {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    background: hsl(220, 15%, 10%);
    border: 1px solid hsl(220, 15%, 24%);
    border-radius: 4px;
    color: hsl(0, 0%, 95%);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    padding: 0.05rem 0.2rem;
    width: 2.9rem;
  }
  .mixer-channel-db-input:focus {
    border-color: hsl(204, 86%, 53%);
    outline: none;
  }
  .mixer-channel-db-unit {
    color: hsl(220, 10%, 65%);
    font-size: 0.75rem;
  }
  .mixer-channel-body {
    align-items: stretch;
    display: flex;
    gap: 0.4rem;
    height: 11rem;
  }
  /* Vertical fader: a range input rotated -90deg. Rotation is purely visual
     and doesn't affect layout, so the input keeps its *unrotated* box for
     sizing purposes - give it a fixed pre-rotation width/height (swapped
     from the wrapper's) and center it absolutely inside a wrapper that's
     sized to the final, on-screen (rotated) footprint. Without the wrapper,
     the unrotated box (previously stretched wide by flex:1) pokes out
     above/below its row, overlapping neighbouring elements. */
  .mixer-fader-wrap {
    flex-shrink: 0;
    height: 100%;
    position: relative;
    width: 2.5rem;
  }
  .mixer-fader {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    height: 2.5rem;
    left: 50%;
    margin: 0;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    width: 11rem;
  }
  .mixer-fader::-webkit-slider-runnable-track {
    background: hsl(220, 15%, 24%);
    border-radius: 999px;
    height: 0.4rem;
  }
  .mixer-fader::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: hsl(204, 86%, 53%);
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    height: 2.2rem;
    margin-top: -0.9rem;
    width: 2.2rem;
  }
  .mixer-fader::-moz-range-track {
    background: hsl(220, 15%, 24%);
    border-radius: 999px;
    height: 0.4rem;
  }
  .mixer-fader::-moz-range-thumb {
    background: hsl(204, 86%, 53%);
    border: none;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    height: 2.2rem;
    width: 2.2rem;
  }
  .mixer-mute-button {
    font-size: 0.8rem;
    height: 2.5rem;
    width: 100%;
  }
</style>
