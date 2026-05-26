<script>
  import { onDestroy } from 'svelte'

  let isRunning = false
  let isListening = false
  let level = 0
  let errorMessage = ''
  let stream
  let audioContext
  let source
  let analyser
  let gain
  let audioData = new Uint8Array(0)
  let animationFrame

  $: if (gain) {
    gain.gain.value = isListening ? 1 : 0
  }

  onDestroy(() => {
    stopMicTest()
  })

  async function startMicTest () {
    if (isRunning) return

    if (!navigator.mediaDevices?.getUserMedia) {
      errorMessage = 'Browser mic access is not available.'
      return
    }

    errorMessage = ''

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
      if (!AudioContextConstructor) {
        throw new Error('Web Audio is not available in this browser.')
      }

      audioContext = new AudioContextConstructor()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      source = audioContext.createMediaStreamSource(stream)
      analyser = audioContext.createAnalyser()
      gain = audioContext.createGain()

      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.85
      gain.gain.value = isListening ? 1 : 0

      source.connect(analyser)
      source.connect(gain)
      gain.connect(audioContext.destination)

      audioData = new Uint8Array(analyser.fftSize)
      isRunning = true
      updateMicLevel()
    } catch (error) {
      stopMicTest()
      errorMessage = error.message || 'Could not start the mic test.'
    }
  }

  function stopMicTest () {
    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = undefined

    stream?.getTracks().forEach(track => track.stop())
    stream = undefined

    source?.disconnect()
    analyser?.disconnect()
    gain?.disconnect()

    source = undefined
    analyser = undefined
    gain = undefined
    audioData = new Uint8Array(0)

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(error => {
        console.debug('Audio context close failed', error)
      })
    }
    audioContext = undefined

    isRunning = false
    level = 0
  }

  function updateMicLevel () {
    if (!isRunning || !analyser) return

    analyser.getByteTimeDomainData(audioData)
    level = getRmsLevel(audioData)
    animationFrame = requestAnimationFrame(updateMicLevel)
  }

  function getRmsLevel (data) {
    if (!data.length) return 0

    let sumSquares = 0
    for (const value of data) {
      const sample = (value - 128) / 128
      sumSquares += sample * sample
    }

    const rms = Math.sqrt(sumSquares / data.length)
    return Math.round(Math.max(0, Math.min(100, Math.sqrt(rms) * 140)))
  }
</script>

<section class="local-mic-section">
  <div class="section-heading">
    <h2 class="title is-5">Local Browser Mic Test</h2>
    <div class="buttons">
      <button
        class="button is-success"
        type="button"
        disabled={isRunning}
        on:click={startMicTest}
      >
        Start
      </button>
      <button
        class="button"
        type="button"
        disabled={!isRunning}
        on:click={stopMicTest}
      >
        Stop
      </button>
    </div>
  </div>

  <label class="checkbox listen-control">
    <input type="checkbox" bind:checked={isListening} />
    Listen locally
  </label>

  <div
    class="meter-track"
    role="meter"
    aria-label="Local browser mic level"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={level}
  >
    <span class="meter-fill" style:width="{level}%"></span>
  </div>

  {#if errorMessage}
    <p class="help is-danger">{errorMessage}</p>
  {/if}
</section>

<style>
  .local-mic-section {
    margin-bottom: 2rem;
  }

  .section-heading {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: space-between;
  }

  .section-heading .title {
    margin-bottom: 0;
  }

  .listen-control {
    display: inline-flex;
    gap: .5rem;
    margin-bottom: .75rem;
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
