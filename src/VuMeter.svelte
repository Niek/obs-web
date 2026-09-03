<script>
  import { onDestroy } from 'svelte'
  import {
    CLIP_AUTO_RESET_MS,
    METER_CLIP_DB,
    METER_FLOOR_DB,
    meterDbToPercent
  } from './obsAudio.js'

  export let levels = null // array of [magnitudeMul, peakMul, inputPeakMul] per audio channel, from InputVolumeMeters
  export let muted = false

  function mulToMeterDb (mul) {
    if (!mul || mul <= 0) return METER_FLOOR_DB
    return Math.max(METER_FLOOR_DB, 20 * Math.log10(mul))
  }

  $: channels = levels && levels.length ? levels : [[0, 0, 0]]

  // Side scale, major ticks every 20dB (OBS itself ticks every 6dB, which
  // is too dense for a card this narrow on a touch screen).
  const scaleTicks = []
  for (let db = 0; db >= METER_FLOOR_DB; db -= 20) scaleTicks.push(db)

  // Clip indicator: latches on once the raw (fader-independent) input peak
  // reaches 0dB, and stays lit - unlike OBS's own 1s flash - until the user
  // taps it or CLIP_AUTO_RESET_MS passes, whichever happens first.
  let clipped = []
  let clipTimers = []

  function updateClipDetection (chans) {
    for (let i = 0; i < chans.length; i++) {
      const inputPeakDb = mulToMeterDb(chans[i][2])
      if (inputPeakDb >= METER_CLIP_DB && !clipped[i]) {
        clipped[i] = true
        clearTimeout(clipTimers[i])
        clipTimers[i] = setTimeout(() => {
          clipped[i] = false
          clipped = clipped
        }, CLIP_AUTO_RESET_MS)
        clipped = clipped
      }
    }
  }

  // `channels` is the only tracked dependency here - state mutated inside
  // updateClipDetection() isn't referenced in this statement's own text, so
  // it can't retrigger itself.
  $: updateClipDetection(channels)

  function resetClip (i) {
    clearTimeout(clipTimers[i])
    clipped[i] = false
    clipped = clipped
  }

  onDestroy(() => {
    clipTimers.forEach((t) => clearTimeout(t))
  })
</script>

<div class="vu-meter-wrap" class:is-muted={muted}>
  <div class="vu-meter-scale" aria-hidden="true">
    {#each scaleTicks as db}
      <span class="vu-meter-tick" style="bottom: {meterDbToPercent(db)}%">{db}</span>
    {/each}
  </div>

  <div class="vu-meter">
    {#each channels as channel, i}
      {@const peakDb = mulToMeterDb(channel[1])}
      <div class="vu-meter-column">
        <button
          type="button"
          class="vu-meter-clip"
          on:click={() => resetClip(i)}
          title={clipped[i] ? 'Clipped - tap to reset' : 'No clipping detected'}
          aria-label="Clip indicator{clipped[i] ? ', clipped, tap to reset' : ', no clipping'}"
        >
          <span class="vu-meter-clip-dot" class:is-clipped={clipped[i]}></span>
        </button>
        <div class="vu-meter-bar">
          <div class="vu-meter-fill" style="clip-path: inset({100 - meterDbToPercent(peakDb)}% 0 0 0)"></div>
        </div>
        <span class="vu-meter-value">{peakDb <= METER_FLOOR_DB ? '-∞' : peakDb.toFixed(0)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .vu-meter-wrap {
    display: flex;
    flex-shrink: 0;
    gap: 0.2rem;
    height: 100%;
  }
  .vu-meter-scale {
    display: flex;
    flex-direction: column;
    font-size: 0.6rem;
    font-variant-numeric: tabular-nums;
    height: 100%;
    padding-bottom: 1rem; /* leave room for the numeric readout row below the bars */
    position: relative;
    width: 1.2rem;
  }
  .vu-meter-tick {
    color: hsl(220, 10%, 55%);
    font-size: 0.6rem;
    position: absolute;
    right: 0;
    transform: translateY(50%);
  }
  .vu-meter {
    display: flex;
    gap: 2px;
    height: 100%;
  }
  /* Column is wide enough for the clip button (a real touch target) and the
     numeric dB label, but the meter bar itself stays thin - like OBS's own
     mixer - and is just centered inside. */
  .vu-meter-column {
    align-items: center;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 2px;
    min-width: 0;
    width: 1.2rem;
  }
  /* The tap target (button) stays as wide as the column - it needs to for
     touch - but the visible indicator inside it (the dot) is only as wide
     as the meter bar below it, so it reads as part of the same thin strip
     instead of looking like a separate, wider element. */
  .vu-meter-clip {
    /* Reset native button chrome - without this, iOS/Safari renders its own
       button appearance with intrinsic min-size/padding that ignores the
       width below, which is what made this look wide despite the CSS. */
    align-items: center;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: none;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    font: inherit;
    height: 1.1rem;
    justify-content: center;
    margin: 0;
    min-width: 0;
    padding: 0;
    width: 100%;
  }
  .vu-meter-clip-dot {
    background: hsl(0, 0%, 20%);
    border-radius: 2px;
    display: block;
    height: 100%;
    width: 0.4rem;
  }
  .vu-meter-clip-dot.is-clipped {
    background: hsl(4, 90%, 58%);
    box-shadow: 0 0 6px hsl(4, 90%, 58%);
  }
  .vu-meter-bar {
    background: hsl(0, 0%, 12%);
    border-radius: 2px;
    flex: 1;
    overflow: hidden;
    position: relative;
    width: 0.4rem;
  }
  .vu-meter-fill {
    bottom: 0;
    left: 0;
    position: absolute;
    top: 0;
    transition: clip-path 60ms linear;
    width: 100%;
    /* Zone boundaries match obsAudio.js's METER_WARNING_DB (-20dB) and
       METER_ERROR_DB (-9dB) against a METER_FLOOR_DB..METER_CLIP_DB
       (-60..0dB) scale: (-20--60)/60=66.67%, (-9--60)/60=85%. This gradient
       is fixed/full-height and revealed via clip-path from the top, so the
       colors sit at their real dB position regardless of current level -
       unlike sizing the gradient to the (shrinking) level itself, which
       would always show the same green->yellow->red spread at any volume. */
    background: linear-gradient(
      to top,
      hsl(140, 70%, 42%) 0%,
      hsl(140, 70%, 42%) 66.67%,
      hsl(48, 95%, 55%) 66.67%,
      hsl(48, 95%, 55%) 85%,
      hsl(4, 90%, 58%) 85%,
      hsl(4, 90%, 58%) 100%
    );
  }
  .vu-meter-value {
    color: hsl(220, 10%, 65%);
    flex-shrink: 0;
    font-size: 0.6rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
    width: 100%;
  }
  .vu-meter-wrap.is-muted .vu-meter-fill {
    background: hsl(0, 0%, 32%);
  }
</style>
