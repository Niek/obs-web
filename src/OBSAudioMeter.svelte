<script>
  import { onDestroy, onMount } from 'svelte'
  import { obs } from './obs.js'

  const FLOOR_DB = -60

  let audioInputs = []
  let pendingAudioInputs = []
  let animationFrame

  onMount(() => {
    obs.on('InputVolumeMeters', onInputVolumeMeters)
  })

  onDestroy(() => {
    obs.off('InputVolumeMeters', onInputVolumeMeters)
    if (animationFrame) cancelAnimationFrame(animationFrame)
  })

  function onInputVolumeMeters (data) {
    pendingAudioInputs = Array.isArray(data?.inputs)
      ? data.inputs.map(normalizeAudioInput)
      : []

    if (!animationFrame) {
      animationFrame = requestAnimationFrame(() => {
        audioInputs = pendingAudioInputs
        animationFrame = undefined
      })
    }
  }

  function normalizeAudioInput (input, index) {
    const name = typeof input?.inputName === 'string'
      ? input.inputName
      : `Input ${index + 1}`

    return {
      id: input?.inputUuid || name,
      name,
      level: Math.round(getInputLevel(input))
    }
  }

  function getInputLevel (input) {
    const dbLevel = getMaxNumber(input?.inputLevelsDb)
    if (Number.isFinite(dbLevel)) {
      return clampPercent(((dbLevel - FLOOR_DB) / Math.abs(FLOOR_DB)) * 100)
    }

    const linearLevel = getMaxNumber(input?.inputLevelsMul)
    if (Number.isFinite(linearLevel)) {
      return clampPercent(Math.sqrt(Math.max(0, linearLevel)) * 100)
    }

    return 0
  }

  function getMaxNumber (value) {
    if (Array.isArray(value)) {
      return value.reduce(
        (max, item) => Math.max(max, getMaxNumber(item)),
        Number.NEGATIVE_INFINITY
      )
    }

    const number = Number(value)
    return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY
  }

  function clampPercent (value) {
    return Math.max(0, Math.min(100, value))
  }
</script>

<section class="audio-meter-section">
  <h2 class="title is-5">OBS Audio Meter</h2>

  {#if audioInputs.length}
    <div class="meter-list">
      {#each audioInputs as input (input.id)}
        <div class="meter-row">
          <div class="meter-heading">
            <span class="meter-name">{input.name}</span>
            <span class="meter-value">{input.level}%</span>
          </div>
          <div
            class="meter-track"
            role="meter"
            aria-label="{input.name} level"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={input.level}
          >
            <span class="meter-fill" style:width="{input.level}%"></span>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="help">No active OBS audio inputs detected.</p>
  {/if}
</section>

<style>
  .audio-meter-section {
    margin-bottom: 2rem;
  }

  .meter-list {
    display: grid;
    gap: .75rem;
  }

  .meter-heading {
    align-items: center;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-bottom: .25rem;
  }

  .meter-name {
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meter-value {
    font-variant-numeric: tabular-nums;
  }

  .meter-track {
    background: #dbdbdb;
    border-radius: 4px;
    height: .75rem;
    overflow: hidden;
  }

  .meter-fill {
    background: linear-gradient(90deg, #23d160 0%, #ffdd57 70%, #ff3860 100%);
    display: block;
    height: 100%;
    transition: width 60ms linear;
  }
</style>
