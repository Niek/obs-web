<script>
  const OBS_WEBSOCKET_LATEST_VERSION = '5.0.1' // https://api.github.com/repos/Palakis/obs-websocket/releases/latest

  // Imports
  import { onDestroy, onMount, tick } from 'svelte'
  import {
    mdiSquareRoundedBadge,
    mdiSquareRoundedBadgeOutline,
    mdiImageEdit,
    mdiImageEditOutline,
    mdiFullscreen,
    mdiFullscreenExit,
    mdiBorderVertical,
    mdiArrowSplitHorizontal,
    mdiAccessPoint,
    mdiAccessPointOff,
    mdiRecord,
    mdiStop,
    mdiPause,
    mdiPlayPause,
    mdiConnection,
    mdiCameraOff,
    mdiCamera,
    mdiMotionPlayOutline,
    mdiMotionPlay,
    mdiContentSaveMoveOutline,
    mdiContentSaveCheckOutline,
    mdiQrcodeScan,
    mdiWifi,
    mdiLayersOutline
  } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { compareVersions } from 'compare-versions'

  import {
    DEFAULT_OBS_ADDRESS,
    OBS_EVENT_SUBSCRIPTIONS,
    obs,
    parseObsConnectionDetails,
    sendCommand
  } from '../obs.js'
  import ProgramPreview from '../ProgramPreview.svelte'
  import SceneSwitcher from '../SceneSwitcher.svelte'
  import SourceSwitcher from '../SourceSwitcher.svelte'
  import ProfileSelect from '../ProfileSelect.svelte'
  import SceneCollectionSelect from '../SceneCollectionSelect.svelte'
  import AudioMixer from '../AudioMixer.svelte'
  import SceneItemsPanel from '../SceneItemsPanel.svelte'

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }

    await checkQrScannerSupport()

    // Request screen wakelock
    if ('wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen')
        // Re-request when coming back
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            await navigator.wakeLock.request('screen')
          }
        })
      } catch (error) {
        console.debug('Wake lock request failed', error)
      }
    }

    // Toggle the navigation hamburger menu on mobile
    const navbar = document.querySelector('.navbar-burger')
    navbar.addEventListener('click', () => {
      navbar.classList.toggle('is-active')
      document
        .getElementById(navbar.dataset.target)
        .classList.toggle('is-active')
    })

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      isFullScreen = document.fullscreenElement
    })

    document.addEventListener('webkitfullscreenchange', () => {
      isFullScreen = document.webkitFullscreenElement
    })

    document.addEventListener('msfullscreenchange', () => {
      isFullScreen = document.msFullscreenElement
    })

    if (document.location.hash !== '') {
      // Read address from hash
      address = document.location.hash.slice(1)

      // This allows you to add a password in the URL like this:
      // http://obs-web.niek.tv/#ws://localhost:4455#password
      if (address.includes('#')) {
        [address, password] = address.split('#')
      }
      await connect()
    }

    if (window.localStorage.getItem('obsAddress')) {
      // If we have a saved address, use that
      address = window.localStorage.getItem('obsAddress')
    }

    // Export the sendCommand() function to the window object
    window.sendCommand = sendCommand
  })

  onDestroy(() => {
    stopQrScanner()
  })

  // State
  let connected
  let heartbeat = {}
  let heartbeatInterval
  let isFullScreen
  let isStudioMode
  let isSceneOnTop = window.localStorage.getItem('isSceneOnTop') || false
  let isProgramItemsPanelOpen = false
  let isPreviewItemsPanelOpen = false
  let isVirtualCamActive
  let isIconMode = window.localStorage.getItem('isIconMode') || false
  let isReplaying
  let editable = false
  let address
  let password
  let scenes = []
  let replayError = ''
  let errorMessage = ''
  let imageFormat = 'jpg'
  let isSaveReplay = false
  let isSaveReplayDisabled = false
  let isQrScannerSupported = false
  let isQrScannerOpen = false
  let qrScannerVideo
  let qrScannerStream
  let qrScannerDetector
  let qrScannerTimeout
  let qrScannerError = ''
  let pendingConfirm = null // { title, message, confirmLabel, confirmClass, action }

  // Stream connection-quality tracking, derived from GetStreamStatus polled
  // every heartbeat tick. outputBytes is cumulative, so bitrate is our own
  // delta-over-time - obs-websocket doesn't hand back a ready-made kbps
  // figure. streamCongestion mirrors OBS's own status bar smoothing
  // (frontend/widgets/OBSBasicStatusBar.cpp: UpdateDroppedFrames) - snap up
  // immediately on a spike, decay down gradually via averaging - so the
  // indicator doesn't flicker between colors every single second.
  let lastStreamBytes = 0
  let lastStreamBytesTime = 0
  let streamKbps = 0
  let streamCongestion = 0

  $: isSceneOnTop
    ? window.localStorage.setItem('isSceneOnTop', 'true')
    : window.localStorage.removeItem('isSceneOnTop')

  $: isIconMode
    ? window.localStorage.setItem('isIconMode', 'true')
    : window.localStorage.removeItem('isIconMode')

  // Dropped-frame percentage straight from obs-websocket's own counters
  // (GetStreamStatus's outputSkippedFrames/outputTotalFrames) - no need to
  // replicate OBS's own calculation, it's already exposed pre-computed.
  $: streamDroppedPercent = heartbeat && heartbeat.streaming && heartbeat.streaming.outputTotalFrames
    ? (heartbeat.streaming.outputSkippedFrames / heartbeat.streaming.outputTotalFrames) * 100
    : 0

  // Same three-way congestion thresholds OBS Studio's own status bar uses
  // (goodThreshold=0.3333, mediocreThreshold=0.6667 in
  // OBSBasicStatusBar.cpp) collapsed onto this app's existing green/
  // yellow/red convention (already used for the VU meter's zones) instead
  // of OBS's separate 4-icon set.
  $: streamHealthClass = streamCongestion <= 0.3333
    ? 'is-success'
    : streamCongestion <= 0.6667
      ? 'is-warning'
      : 'is-danger'

  function updateStreamHealth (streaming) {
    const now = performance.now()
    if (!streaming || !streaming.outputActive) {
      lastStreamBytes = 0
      lastStreamBytesTime = 0
      streamKbps = 0
      streamCongestion = 0
      return
    }

    if (lastStreamBytesTime > 0 && streaming.outputBytes >= lastStreamBytes) {
      const deltaBytes = streaming.outputBytes - lastStreamBytes
      const deltaSeconds = (now - lastStreamBytesTime) / 1000
      if (deltaSeconds > 0) streamKbps = (deltaBytes * 8) / deltaSeconds / 1000
    }
    lastStreamBytes = streaming.outputBytes
    lastStreamBytesTime = now

    const congestion = typeof streaming.outputCongestion === 'number' ? streaming.outputCongestion : 0
    streamCongestion = Math.min(1, Math.max(congestion, (congestion + streamCongestion) * 0.5))
  }

  function requestConfirm (config) {
    pendingConfirm = config
  }

  async function confirmPendingAction () {
    const config = pendingConfirm
    pendingConfirm = null
    if (config) await config.action()
  }

  function cancelPendingAction () {
    pendingConfirm = null
  }

  // Makes the confirmation dialog behave like a real modal for keyboard/
  // screen-reader users: moves focus inside on open, keeps Tab cycling
  // within the dialog instead of reaching the (visually hidden-behind-
  // overlay but still-in-DOM-order) page controls, restores focus to
  // whatever triggered the dialog on close, and treats Escape as Cancel.
  function trapFocus (node) {
    const previouslyFocused = document.activeElement

    function getFocusable () {
      return Array.from(
        node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.disabled)
    }

    function handleKeydown (event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelPendingAction()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Capture phase so this runs before any other keydown handling and
    // reliably intercepts Tab/Escape regardless of which descendant has
    // focus.
    document.addEventListener('keydown', handleKeydown, true)
    ;(node.querySelector('[data-modal-initial-focus]') || getFocusable()[0] || node).focus()

    return {
      destroy () {
        document.removeEventListener('keydown', handleKeydown, true)
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus()
        }
      }
    }
  }

  function formatTime (secs) {
    secs = Math.round(secs / 1000)
    const hours = Math.floor(secs / 3600)
    secs -= hours * 3600
    const mins = Math.floor(secs / 60)
    secs -= mins * 60
    return hours > 0
      ? `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
      : `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  function toggleFullScreen () {
    if (isFullScreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen()
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen()
      }
    }
  }

  async function toggleStudioMode () {
    await sendCommand('SetStudioModeEnabled', {
      studioModeEnabled: !isStudioMode
    })
  }

  function setReplayError (message) {
    replayError = message
    setTimeout(() => {
      replayError = ''
    }, 5000)
  }

  async function toggleReplay () {
    const data = await sendCommand('ToggleReplayBuffer')
    console.debug('ToggleReplayBuffer', data.outputActive)
    if (data.outputActive === undefined) {
      setReplayError('Replay buffer is not enabled.')
    } else isReplaying = data.outputActive
  }

  async function saveReplay () {
    const data = await sendCommand('GetReplayBufferStatus')
    console.debug('GetReplayBufferStatus', data.outputActive)
    if (!data.outputActive) {
      setReplayError('Replay buffer is not enabled.')
      return
    }
    await sendCommand('SaveReplayBuffer')
    isSaveReplayDisabled = true
    isSaveReplay = true
    setTimeout(() => {
      isSaveReplay = false
      isSaveReplayDisabled = false
    }, 2500)
  }

  async function switchSceneView () {
    isSceneOnTop = !isSceneOnTop
  }

  async function startStream () {
    await sendCommand('StartStream')
  }

  async function stopStream () {
    await sendCommand('StopStream')
  }

  async function startRecording () {
    await sendCommand('StartRecord')
  }

  async function stopRecording () {
    await sendCommand('StopRecord')
  }

  async function startVirtualCam () {
    await sendCommand('StartVirtualCam')
  }

  async function stopVirtualCam () {
    await sendCommand('StopVirtualCam')
  }

  async function pauseRecording () {
    await sendCommand('PauseRecord')
  }

  async function resumeRecording () {
    await sendCommand('ResumeRecord')
  }

  async function checkQrScannerSupport () {
    if (!globalThis.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      return
    }

    try {
      const formats = await globalThis.BarcodeDetector.getSupportedFormats?.()
      isQrScannerSupported = !formats || formats.includes('qr_code')
    } catch (error) {
      console.debug('Could not check barcode formats', error)
      isQrScannerSupported = true
    }
  }

  async function startQrScanner () {
    if (!isQrScannerSupported || isQrScannerOpen) {
      return
    }

    qrScannerError = ''
    isQrScannerOpen = true
    await tick()

    try {
      qrScannerDetector =
        qrScannerDetector ||
        new globalThis.BarcodeDetector({ formats: ['qr_code'] })
      qrScannerStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        }
      })
      qrScannerVideo.srcObject = qrScannerStream
      await qrScannerVideo.play()
      scanQrCode()
    } catch (error) {
      stopQrScanner(false)
      qrScannerError = error.message || 'Could not start the QR scanner.'
    }
  }

  function stopQrScanner (close = true) {
    clearTimeout(qrScannerTimeout)
    qrScannerTimeout = undefined
    qrScannerStream?.getTracks().forEach(track => track.stop())
    qrScannerStream = undefined

    if (qrScannerVideo) qrScannerVideo.srcObject = null
    isQrScannerOpen = !close
    if (close) qrScannerError = ''
  }

  async function scanQrCode () {
    if (!isQrScannerOpen || !qrScannerVideo || !qrScannerDetector) {
      return
    }

    try {
      const barcodes = qrScannerVideo.readyState < 2
        ? []
        : await qrScannerDetector.detect(qrScannerVideo)
      const obsQrCode = barcodes.find(barcode =>
        /^obswss?:\/\//i.test(barcode.rawValue)
      )

      if (obsQrCode) {
        await connectToScannedQrCode(obsQrCode.rawValue)
        return
      }

      if (barcodes.length > 0) {
        qrScannerError = 'This QR code is not an OBS websocket connection.'
      }
    } catch (error) {
      console.debug('QR scan failed', error)
    }

    qrScannerTimeout = setTimeout(scanQrCode, 250)
  }

  async function connectToScannedQrCode (value) {
    try {
      const details = parseObsConnectionDetails(
        value,
        password,
        document.location.protocol === 'https:'
      )
      address = details.address
      password = details.password
    } catch (error) {
      qrScannerError = 'This QR code is not an OBS websocket connection.'
      return
    }

    stopQrScanner()

    if (
      document.location.protocol === 'https:' &&
      address.startsWith('ws://')
    ) {
      errorMessage =
        'This QR code uses a non-secure websocket. Load the non-secure page or use a WSS connection.'
      return
    }

    await connect()
  }

  async function connect () {
    try {
      const details = parseObsConnectionDetails(
        address,
        password,
        location.protocol === 'https:'
      )
      address = details.address
      password = details.password
      console.log('Connecting to:', address, '- using password:', password)
      await disconnect()
      const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
        address,
        password,
        { eventSubscriptions: OBS_EVENT_SUBSCRIPTIONS }
      )
      console.log(
        `Connected to obs-websocket version ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`
      )
      window.localStorage.setItem('obsAddress', address) // Save address for next time
    } catch (e) {
      console.log(e)
      errorMessage = e.message
    }
  }

  async function disconnect () {
    await obs.disconnect()
    clearInterval(heartbeatInterval)
    connected = false
    errorMessage = 'Disconnected'
  }

  // OBS events
  obs.on('ConnectionClosed', () => {
    connected = false
    window.history.pushState(
      '',
      document.title,
      window.location.pathname + window.location.search
    ) // Remove the hash
    console.log('Connection closed')
  })

  obs.on('Identified', async () => {
    console.log('Connected')
    connected = true
    document.location.hash = address // For easy bookmarking
    const data = await sendCommand('GetVersion')
    const version = data.obsWebSocketVersion || ''
    console.log('OBS-websocket version:', version)
    if (compareVersions(version, OBS_WEBSOCKET_LATEST_VERSION) < 0) {
      alert(
        'You are running an outdated OBS-websocket (version ' +
          version +
          '), please upgrade to the latest version for full compatibility.'
      )
    }
    if (
      data.supportedImageFormats.includes('webp') &&
      document
        .createElement('canvas')
        .toDataURL('image/webp')
        .indexOf('data:image/webp') === 0
    ) {
      imageFormat = 'webp'
    }
    heartbeatInterval = setInterval(async () => {
      const stats = await sendCommand('GetStats')
      const streaming = await sendCommand('GetStreamStatus')
      const recording = await sendCommand('GetRecordStatus')
      heartbeat = { stats, streaming, recording }
      updateStreamHealth(streaming)
      // console.log(heartbeat);
    }, 1000) // Heartbeat
    isStudioMode =
      (await sendCommand('GetStudioModeEnabled')).studioModeEnabled || false
    isVirtualCamActive =
      (await sendCommand('GetVirtualCamStatus')).outputActive || false
  })

  obs.on('ConnectionError', async () => {
    errorMessage = 'Please enter your password:'
    document.getElementById('password').focus()
    if (!password) {
      connected = false
    } else {
      await connect()
    }
  })

  obs.on('VirtualcamStateChanged', async (data) => {
    console.log('VirtualcamStateChanged', data.outputActive)
    isVirtualCamActive = data && data.outputActive
  })

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data && data.studioModeEnabled
  })

  obs.on('ReplayBufferStateChanged', async (data) => {
    console.log('ReplayBufferStateChanged', data)
    isReplaying = data && data.outputActive
  })
</script>

<svelte:head>
  <title>OBS-web remote control</title>
</svelte:head>

<nav class="navbar is-primary is-fixed-top" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item is-size-4 has-text-weight-bold" href="/">
      <img src="favicon.png" alt="OBS-web" class="rotate" /></a
    >

    <!-- svelte-ignore a11y-missing-attribute -->
    <button
      class="navbar-burger burger"
      aria-label="menu"
      aria-expanded="false"
      data-target="navmenu"
    >
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>

  <div id="navmenu" class="navbar-menu">
    <div class="navbar-end">
      <div class="navbar-item">
        <div class="buttons">
          <!-- svelte-ignore a11y-missing-attribute -->
          {#if connected}
            <button class="button is-info is-light" disabled>
              {#if heartbeat && heartbeat.stats}
                {Math.round(heartbeat.stats.activeFps)} fps, {Math.round(
                  heartbeat.stats.cpuUsage
                )}% CPU, {heartbeat.stats.renderSkippedFrames} skipped frames
              {:else}Connected{/if}
            </button>
            {#if heartbeat && heartbeat.streaming && heartbeat.streaming.outputActive}
              <button
                class="button is-danger"
                on:click={() => requestConfirm({
                  title: 'Stop Stream?',
                  message: 'Do you really want to stop the stream?',
                  confirmLabel: 'Stop Stream',
                  confirmClass: 'is-danger',
                  action: stopStream
                })}
                title="Stop Stream"
              >
                <span class="icon"><Icon path={mdiAccessPointOff} /></span>
                <span>{formatTime(heartbeat.streaming.outputDuration)}</span>
              </button>
              <button
                class="button {streamHealthClass} is-light"
                disabled
                title="Stream connection quality"
              >
                <span class="icon"><Icon path={mdiWifi} /></span>
                <span>{Math.round(streamKbps)} kbps · {streamDroppedPercent.toFixed(1)}% dropped</span>
              </button>
            {:else}
              <button
                class="button is-danger is-light"
                on:click={() => requestConfirm({
                  title: 'Start Stream?',
                  message: 'Do you really want to start the stream?',
                  confirmLabel: 'Start Stream',
                  confirmClass: 'is-danger',
                  action: startStream
                })}
                title="Start Stream"
              >
                <span class="icon"><Icon path={mdiAccessPoint} /></span>
              </button>
            {/if}
            {#if heartbeat && heartbeat.recording && heartbeat.recording.outputActive}
              {#if heartbeat.recording.outputPaused}
                <button
                  class="button is-danger"
                  on:click={resumeRecording}
                  title="Resume Recording"
                >
                  <span class="icon"><Icon path={mdiPlayPause} /></span>
                </button>
              {:else}
                <button
                  class="button is-success"
                  on:click={pauseRecording}
                  title="Pause Recording"
                >
                  <span class="icon"><Icon path={mdiPause} /></span>
                </button>
              {/if}
              <button
                class="button is-danger"
                on:click={() => requestConfirm({
                  title: 'Stop Recording?',
                  message: 'Do you really want to stop the recording?',
                  confirmLabel: 'Stop Recording',
                  confirmClass: 'is-danger',
                  action: stopRecording
                })}
                title="Stop Recording"
              >
                <span class="icon"><Icon path={mdiStop} /></span>
                <span>{formatTime(heartbeat.recording.outputDuration)}</span>
              </button>
            {:else}
              <button
                class="button is-danger is-light"
                on:click={() => requestConfirm({
                  title: 'Start Recording?',
                  message: 'Do you really want to start the recording?',
                  confirmLabel: 'Start Recording',
                  confirmClass: 'is-danger',
                  action: startRecording
                })}
                title="Start Recording"
              >
                <span class="icon"><Icon path={mdiRecord} /></span>
              </button>
            {/if}
            {#if isVirtualCamActive}
              <button
                class="button is-danger"
                on:click={stopVirtualCam}
                title="Stop Virtual Webcam"
              >
                <span class="icon"><Icon path={mdiCameraOff} /></span>
              </button>
            {:else}
              <button
                class="button is-danger is-light"
                on:click={startVirtualCam}
                title="Start Virtual Webcam"
              >
                <span class="icon"><Icon path={mdiCamera} /></span>
              </button>
            {/if}
            {#if scenes.length > 1 || isStudioMode}
              <!-- With only one (or zero) scenes, Studio Mode has nothing
                   meaningful to preview differently from Program - hidden
                   in that case rather than disabled, but still shown
                   whenever isStudioMode is already true (e.g. scenes got
                   deleted down to 1 while it was on) so it's never
                   impossible to turn back off. -->
              <button
                class:is-light={!isStudioMode}
                class="button is-link"
                on:click={toggleStudioMode}
                title="Toggle Studio Mode"
              >
                <span class="icon"><Icon path={mdiBorderVertical} /></span>
              </button>
            {/if}
            {#if isStudioMode}
              <!-- Ordered left-to-right to match the panels they open: this
                   button sits to the left of the Program/Live one below, and
                   opens the panel on the left side of the screen
                   (side="left") - the two buttons previously appeared in the
                   opposite order from the panels they controlled, which
                   read as "crossed" (left button opening the right panel). -->
              <button
                class:is-light={!isPreviewItemsPanelOpen}
                class="button is-success"
                on:click={() => (isPreviewItemsPanelOpen = !isPreviewItemsPanelOpen)}
                title="Show/Hide Preview Scene Items"
              >
                <span class="icon"><Icon path={mdiLayersOutline} /></span>
              </button>
            {/if}
            <button
              class:is-light={!isProgramItemsPanelOpen}
              class="button is-danger"
              on:click={() => (isProgramItemsPanelOpen = !isProgramItemsPanelOpen)}
              title="Show/Hide Program (Live) Scene Items"
            >
              <span class="icon"><Icon path={mdiLayersOutline} /></span>
            </button>
            <button
              class:is-light={!isSceneOnTop}
              class="button is-link"
              on:click={switchSceneView}
              title="Show Scene on Top"
            >
              <span class="icon"><Icon path={mdiArrowSplitHorizontal} /></span>
            </button>
            <button
              class:is-light={!editable}
              class="button is-link"
              title="Edit Scenes"
              on:click={() => (editable = !editable)}
            >
              <span class="icon">
                <Icon path={editable ? mdiImageEditOutline : mdiImageEdit} />
              </span>
            </button>
            <button
              class:is-light={!isIconMode}
              class="button is-link"
              title="Show Scenes as Icons"
              on:click={() => (isIconMode = !isIconMode)}
            >
              <span class="icon">
                <Icon
                  path={isIconMode
                    ? mdiSquareRoundedBadgeOutline
                    : mdiSquareRoundedBadge}
                />
              </span>
            </button>
            <button
              class:is-light={!isReplaying}
              class:is-danger={replayError}
              class="button is-link"
              title="Toggle Replay Buffer"
              on:click={toggleReplay}
            >
              <span class="icon">
                <Icon
                  path={isReplaying ? mdiMotionPlayOutline : mdiMotionPlay}
                />
              </span>
              {#if replayError}<span>{replayError}</span>{/if}
            </button>
            <button
              class:is-light={!isSaveReplay}
              class="button is-link"
              title="Save Replay Buffer"
              on:click={() => {
                if (!isSaveReplayDisabled) {
                  saveReplay()
                }
                isSaveReplayDisabled = !isSaveReplayDisabled
              }}
            >
              <span class="icon">
                <Icon
                  path={isSaveReplay ? mdiContentSaveCheckOutline : mdiContentSaveMoveOutline}
                />
              </span>
              {#if replayError}<span>{replayError}</span>{/if}
            </button>
            <ProfileSelect />
            <SceneCollectionSelect />
            <button
              class="button is-danger is-light"
              on:click={disconnect}
              title="Disconnect"
            >
              <span class="icon"><Icon path={mdiConnection} /></span>
            </button>
          {:else}
            <button class="button is-danger" disabled
              >{errorMessage || 'Disconnected'}</button
            >
          {/if}
          <!-- svelte-ignore a11y-missing-attribute -->
          <button
            class:is-light={!isFullScreen}
            class="button is-link"
            on:click={toggleFullScreen}
            title="Toggle Fullscreen"
          >
            <span class="icon">
              <Icon path={isFullScreen ? mdiFullscreenExit : mdiFullscreen} />
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</nav>

<section class="section">
  <div class="container">
    {#if connected}
      {#if isSceneOnTop}
        <ProgramPreview {imageFormat} />
      {/if}
      <SceneSwitcher
        bind:scenes
        buttonStyle={isIconMode ? 'icon' : 'text'}
        {editable}
      />
      {#if !isSceneOnTop}
        <ProgramPreview {imageFormat} />
      {/if}
      {#each scenes as scene}
        {#if scene.sceneName.indexOf('(switch)') > 0}
          <SourceSwitcher
            name={scene.sceneName}
            {imageFormat}
            buttonStyle="screenshot"
          />
        {/if}
      {/each}
      <AudioMixer />
      <SceneItemsPanel
        mode="program"
        side="right"
        open={isProgramItemsPanelOpen}
        on:close={() => (isProgramItemsPanelOpen = false)}
      />
      {#if isStudioMode}
        <SceneItemsPanel
          mode="preview"
          side="left"
          open={isPreviewItemsPanelOpen}
          on:close={() => (isPreviewItemsPanelOpen = false)}
        />
      {/if}
    {:else}
      <h1 class="subtitle">
        Welcome to
        <strong>OBS-web</strong>
        - the easiest way to control
        <a href="https://obsproject.com/" target="_blank" rel="noreferrer"
          >OBS</a
        >
        remotely!
      </h1>

      {#if document.location.protocol === 'https:'}
        <div class="notification is-danger">
          You are checking this page on a secure HTTPS connection. That's great,
          but it means you can
          <strong>only</strong>
          connect to WSS (secure websocket) addresses, for example OBS exposed with
          <a href="https://ngrok.com/">ngrok</a>
          or
          <a href="https://pagekite.net/">pagekite</a>
          . If you want to connect to a local OBS instance,
          <strong>
            <a
              href="http://{document.location.hostname}{document.location.port
                ? ':' + document.location.port
                : ''}{document.location.pathname}"
            >
              please click here to load the non-secure version of this page
            </a>
          </strong>
          .
        </div>
      {/if}

      <p>To get started, enter your OBS host:port below and click "connect".</p>

      <form on:submit|preventDefault={connect}>
        <div class="field is-grouped connect-field">
          <p class="control is-expanded">
            <span class="connect-address-control">
              <input
                id="host"
                bind:value={address}
                class="input"
                class:has-qr-scanner={isQrScannerSupported}
                type="text"
                autocomplete="off"
                placeholder={DEFAULT_OBS_ADDRESS}
              />
              {#if isQrScannerSupported}
                <button
                  class="button is-white qr-scan-button"
                  type="button"
                  title="Scan OBS QR code"
                  aria-label="Scan OBS QR code"
                  on:click={startQrScanner}
                >
                  <span class="icon"><Icon path={mdiQrcodeScan} /></span>
                </button>
              {/if}
            </span>
            <input
              id="password"
              bind:value={password}
              class="input"
              type="password"
              autocomplete="current-password"
              placeholder="password (leave empty if you have disabled authentication)"
            />
          </p>
          <p class="control">
            <button class="button is-success">Connect</button>
          </p>
        </div>
      </form>

      {#if isQrScannerOpen}
        <div class="modal is-active">
          <div class="modal-background"></div>
          <div class="modal-card">
            <header class="modal-card-head">
              <p class="modal-card-title">Scan OBS QR</p>
              <button
                class="delete"
                type="button"
                aria-label="close"
                on:click={stopQrScanner}
              ></button>
            </header>
            <section class="modal-card-body">
              <video
                bind:this={qrScannerVideo}
                class="qr-scanner-video"
                autoplay
                muted
                playsinline
              ></video>
              {#if qrScannerError}
                <p class="help is-danger">{qrScannerError}</p>
              {:else if !qrScannerStream}
                <p class="help">Starting camera...</p>
              {:else}
                <p class="help">Looking for OBS QR code...</p>
              {/if}
              <p class="help">
                Find it in OBS under WebSocket Server Settings -> Show Connect
                Info.
              </p>
            </section>
            <footer class="modal-card-foot">
              <button
                class="button"
                type="button"
                on:click={stopQrScanner}
              >
                Cancel
              </button>
            </footer>
          </div>
        </div>
      {/if}
      <p class="help">
        Make sure that you use <a
          href="https://github.com/obsproject/obs-studio/releases">OBS v28+</a
        >
        or install the
        <a
          href="https://github.com/obsproject/obs-websocket/releases/tag/{OBS_WEBSOCKET_LATEST_VERSION}"
          target="_blank"
          rel="noreferrer"
          >obs-websocket {OBS_WEBSOCKET_LATEST_VERSION} plugin</a
        >
        for v27. If you use an older version of OBS, see the
        <a href="/v4/">archived OBS-web v4</a> page.
      </p>
    {/if}
  </div>
</section>

{#if pendingConfirm}
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-confirm-title"
      tabindex="-1"
      use:trapFocus
    >
      <header class="modal-card-head">
        <p class="modal-card-title" id="pending-confirm-title">{pendingConfirm.title}</p>
        <button
          class="delete"
          type="button"
          aria-label="close"
          on:click={cancelPendingAction}
        ></button>
      </header>
      <section class="modal-card-body">
        <p>{pendingConfirm.message}</p>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" on:click={cancelPendingAction} data-modal-initial-focus>
          Cancel
        </button>
        <button
          class="button {pendingConfirm.confirmClass}"
          type="button"
          on:click={confirmPendingAction}
        >
          {pendingConfirm.confirmLabel}
        </button>
      </footer>
    </div>
  </div>
{/if}

<footer class="footer">
  <div class="content has-text-centered">
    <p>
      <strong>OBS-web</strong>
      by
      <a href="https://niekvandermaas.nl/">Niek van der Maas</a>
      &mdash; see
      <a href="https://github.com/Niek/obs-web">GitHub</a>
      for source code.
    </p>
  </div>
</footer>
