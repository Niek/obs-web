<script>
  /* eslint-env browser */
  const OBS_WEBSOCKET_LATEST_VERSION = '5.0.1' // https://api.github.com/repos/Palakis/obs-websocket/releases/latest

  // Imports
  import { onMount } from 'svelte'
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
    mdiMotionPlay
  } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { compareVersions } from 'compare-versions'

  import './style.scss'
  import { obs, sendCommand } from './obs.js'
  import FramerateSelect from './FramerateSelect.svelte'
  import ProgramPreview from './ProgramPreview.svelte'
  import SceneSwitcher from './SceneSwitcher.svelte'
  import SourceSwitcher from './SourceSwitcher.svelte'
  import ProfileSelect from './ProfileSelect.svelte'
  import SceneCollectionSelect from './SceneCollectionSelect.svelte'
  import Mixer from './Mixer.svelte'
  import Status from './Status.svelte';
  import StreamDestinationInput from './StreamDestinationInput.svelte';
  import BrowserInputController from './BrowserInputController.svelte';

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }

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
      } catch (e) {}
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

    // Export the sendCommand() function to the window object
    window.sendCommand = sendCommand
  })

  // State
  let connected
  let heartbeat = {}
  let heartbeatInterval
  let isFullScreen
  let isStudioMode
  let isSceneOnTop
  let isVirtualCamActive
  let isIconMode = window.localStorage.getItem('isIconMode') || false
  let isReplaying
  let isStreaming
  let isRecording
  let editable = false
  let address
  let password
  let scenes = []
  let replayError = ''
  let errorMessage = ''
  let imageFormat = 'jpg'
  let isLocked = false

  $: isIconMode
    ? window.localStorage.setItem('isIconMode', 'true')
    : window.localStorage.removeItem('isIconMode')

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

  async function toggleReplay () {
    const data = await sendCommand('ToggleReplayBuffer')
    console.debug('ToggleReplayBuffer', data.outputActive)
    if (data.outputActive === undefined) {
      replayError = 'Replay buffer is not enabled.'
      setTimeout(function () {
        replayError = ''
      }, 5000)
    } else isReplaying = data.outputActive
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

  async function connect () {
    address = address || 'ws://localhost:4455'
    if (address.indexOf('://') === -1) {
      const secure = location.protocol === 'https:' || address.endsWith(':443')
      address = secure ? 'wss://' : 'ws://' + address
    }
    console.log('Connecting to:', address, '- using password:', password)
    await disconnect()
    try {
      const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
        address,
        password,
        // {
        //   eventSubscriptions: eventSubscription.InputVolumeMeters,
        //   rpcVersion: 1
        // }
      )
      console.log(
        `Connected to obs-websocket version ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`
      )
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
      //console.log(heartbeat);
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
    isLocked = isVirtualCamActive
  })

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data && data.studioModeEnabled
  })

  obs.on('ReplayBufferStateChanged', async (data) => {
    console.log('ReplayBufferStateChanged', data)
    isReplaying = data && data.outputActive
  })

  obs.on('StreamStateChanged', async (data) => {
    console.log('StreamStateChanged', data)
    isStreaming = data && data.outputActive
    isLocked = isStreaming
  })

  obs.on('RecordStateChanged', async (data) => {
    console.log('ReplayBufferStateChanged', data)
    isRecording = data && data.outputActive
    isLocked = isRecording
  })
</script>

<svelte:head>
  <title>OBS-web remote control</title>
</svelte:head>

<nav class="navbar is-dark" aria-label="main navigation">
  <div class="navbar-brand">

    <!-- svelte-ignore a11y-missing-attribute -->
    <button
      class="navbar-burger burger"
      aria-label="menu"
      aria-expanded="false"
      data-target="navmenu"
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  </div>

  <div id="navmenu" class="navbar-menu">
    <div class="navbar-start">
      {#if connected}
        <div class="navbar-item">
          <StreamDestinationInput uiLock={isLocked}/>
          <BrowserInputController uiLock={isLocked}/>
        </div>
      {/if}
    </div>
    <div class="navbar-end">
      <div class="navbar-item">
        <div class="buttons">
          <!-- svelte-ignore a11y-missing-attribute -->
          {#if connected}
            {#if heartbeat && heartbeat.streaming && heartbeat.streaming.outputActive}
              <button
                class="button is-danger"
                on:click={stopStream}
                title="Stop Stream"
              >
                <span class="icon"><Icon path={mdiAccessPointOff} /></span>
                <span>{formatTime(heartbeat.streaming.outputDuration)}</span>
              </button>
            {:else}
              <button
                class="button is-danger is-light {isLocked ? 'is-locked' : ''}"
                on:click={startStream}
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
                on:click={stopRecording}
                title="Stop Recording"
              >
                <span class="icon"><Icon path={mdiStop} /></span>
                <span>{formatTime(heartbeat.recording.outputDuration)}</span>
              </button>
            {:else}
              <button
                class="button is-danger is-light {isLocked ? 'is-locked' : ''}"
                on:click={startRecording}
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
                class="button is-danger is-light {isLocked ? 'is-locked' : ''}"
                on:click={startVirtualCam}
                title="Start Virtual Webcam"
              >
                <span class="icon"><Icon path={mdiCamera} /></span>
              </button>
            {/if}
            <button
              class:is-light={!isStudioMode}
              class="button is-link"
              on:click={toggleStudioMode}
              title="Toggle Studio Mode"
            >
              <span class="icon"><Icon path={mdiBorderVertical} /></span>
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
              class="button is-link is-hidden"
              title="Edit Scenes"
              on:click={() => (editable = !editable)}
            >
              <span class="icon">
                <Icon path={editable ? mdiImageEditOutline : mdiImageEdit} />
              </span>
            </button>
            <button
              class:is-light={!isIconMode}
              class="button is-link is-hidden"
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
              class="button is-link is-hidden"
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
            <ProfileSelect uiLock={isLocked}/>
            <FramerateSelect uiLock={isLocked}/>
            <SceneCollectionSelect uiLock={isLocked}/>
            <button
              class="button is-danger is-light {isLocked ? 'is-locked' : ''}"
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

<section class="section has-background-black-ter">
  <div class="container">
    {#if connected}
    <Status bind:heartbeat />
      {#if isSceneOnTop}
        <ProgramPreview {imageFormat} />
        <Mixer />
      {/if}
      <SceneSwitcher
        bind:scenes
        buttonStyle={isIconMode ? 'icon' : 'text'}
        {editable}
      />
      {#if !isSceneOnTop}
        <ProgramPreview {imageFormat} />
        <Mixer />
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
    {:else}
      <p>Select OBS Instance</p>
      <form on:submit|preventDefault={connect}>
        <div class="field is-grouped">
          <p class="control is-expanded">
            <input
              id="host"
              bind:value={address}
              class="input"
              type="text"
              autocomplete=""
              placeholder="ws://localhost:4455"
            />
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
    {/if}
  </div>
</section>
