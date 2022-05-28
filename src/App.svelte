<script>
  const OBS_WEBSOCKET_LATEST_VERSION = '4.8.0'; // https://api.github.com/repos/Palakis/obs-websocket/releases/latest

  // Imports
  import { onMount } from 'svelte';
  import { mdiSquareRoundedBadge, mdiSquareRoundedBadgeOutline, mdiImageEdit, mdiImageEditOutline, mdiFullscreen, mdiFullscreenExit, mdiBorderVertical, mdiArrowSplitHorizontal, mdiAccessPoint, mdiAccessPointOff, mdiRecord, mdiStop, mdiPause, mdiPlayPause, mdiConnection } from '@mdi/js';
  import Icon from 'mdi-svelte';
  import compareVersions from 'compare-versions';

  import './style.scss';
  import { obs, sendCommand } from './obs.js';
  import ProgramPreview from './ProgramPreview.svelte';
  import SceneSwitcher from './SceneSwitcher.svelte';
  import SourceSwitcher from './SourceSwitcher.svelte';
  import ProfileSelect from './ProfileSelect.svelte';
  import SceneCollectionSelect from './SceneCollectionSelect.svelte';

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }

    // Request screen wakelock
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
          // Re-request when coming back
          document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
              wakeLock = await navigator.wakeLock.request('screen');
            }
          });
      }
      catch(e) { }
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      isFullScreen = document.fullscreenElement;
    });

    document.addEventListener('webkitfullscreenchange', () => {
      isFullScreen = document.webkitFullscreenElement;
    });

    document.addEventListener('msfullscreenchange', () => {
      isFullScreen = document.msFullscreenElement;
    });

    if (document.location.hash !== '') {
      // Read address from hash
      address = document.location.hash.slice(1);
      await connect();
    }
  });

  // State
  let connected,
    heartbeat = false,
    isFullScreen,
    isStudioMode,
    isSceneOnTop,
    isIconMode = window.localStorage.getItem('isIconMode') || false,
    editable = false,
    wakeLock = false,
    address,
    password,
    scenes = [],
    errorMessage = '';

  $: isIconMode 
      ? window.localStorage.setItem('isIconMode', "true")
      : window.localStorage.removeItem('isIconMode');
  
  function formatTime(secs) {
    let hours = Math.floor(secs / 3600);
    secs -= hours * 3600;
    let mins = Math.floor(secs / 60);
    secs -= mins * 60;
    return (hours > 0)
      ? `${hours}:${mins<10?'0':''}${mins}:${secs<10?'0':''}${secs}`
      : `${mins<10?'0':''}${mins}:${secs<10?'0':''}${secs}`;
  }

  function toggleFullScreen() {
    if (isFullScreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    }
  }

  async function toggleStudioMode() {
    await sendCommand('ToggleStudioMode');
  }

  async function switchSceneView() {
    isSceneOnTop = !isSceneOnTop;
  }

  async function startStream() {
    await sendCommand('StartStreaming');
  }

  async function stopStream() {
    await sendCommand('StopStreaming');
  }

  async function startRecording() {
    await sendCommand('StartRecording');
  }

  async function stopRecording() {
    await sendCommand('StopRecording');
  }

  async function pauseRecording(){
    await sendCommand('PauseRecording');
  }

  async function resumeRecording(){
    await sendCommand('ResumeRecording');
  }

  async function connect() {
    address = address || 'localhost:4444';
    let secure = location.protocol === 'https:' || address.endsWith(':443');
    if (address.indexOf('://') !== -1) {
      let url = new URL(address);
      secure = url.protocol === 'wss:' || url.protocol === 'https:';
      address = url.hostname + ':' + (url.port ? url.port : secure ? 443 : 80);
    }
    console.log('Connecting to:', address, '- secure:', secure, '- using password:', password);
    await disconnect();
    try {
      await obs.connect({ address: address, password, secure });
    } catch (e) {
      console.log(e);
      errorMessage = e.description;
    }
  }

  async function disconnect() {
    await obs.disconnect();
    connected = false;
    errorMessage = 'Disconnected';
  }

  async function onKeyup(event) {
    if (event.key === 'Enter') {
      await connect();
      event.preventDefault();
    }
  }

  // OBS events
  obs.on('ConnectionClosed', () => {
    connected = false;
    window.history.pushState('', document.title, window.location.pathname + window.location.search); // Remove the hash
    console.log('Connection closed');
  });

  obs.on('AuthenticationSuccess', async () => {
    console.log('Connected');
    connected = true;
    document.location.hash = address; // For easy bookmarking
    const version = (await sendCommand('GetVersion')).obsWebsocketVersion || '';
    console.log('OBS-websocket version:', version);
    if(compareVersions(version, OBS_WEBSOCKET_LATEST_VERSION) < 0) {
      alert('You are running an outdated OBS-websocket (version ' + version + '), please upgrade to the latest version for full compatibility.');
    }
    await sendCommand('SetHeartbeat', { enable: true });
    let data = await sendCommand('GetStudioModeStatus');
    isStudioMode = (data && data.studioMode) || false;
  });

  obs.on('AuthenticationFailure', async () => {
    errorMessage = 'Please enter your password:';
    document.getElementById('password').focus();
    if (!password) {
      connected = false;
    } else {
      await connect();
    }
  });

  // Heartbeat
  obs.on('Heartbeat', data => {
    heartbeat = data;
  });

  obs.on('StudioModeSwitched', async (data) => {
    console.log('StudioModeSwitched', data.newState);
    isStudioMode = (data && data.studioMode) || false;
  });
</script>

<svelte:head>
  <title>OBS-web remote control</title>
</svelte:head>

<nav class="navbar is-primary" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item is-size-4 has-text-weight-bold" href="/">
      <img src="favicon.png" alt="OBS-web" class="rotate" /></a>

    <!-- svelte-ignore a11y-missing-attribute -->
    <button class="navbar-burger burger" aria-label="menu" aria-expanded="false" data-target="navmenu">
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  </div>

  <div id="navmenu" class="navbar-menu">
    <div class="navbar-end">
      <div class="navbar-item">
        <div class="buttons">
          <!-- svelte-ignore a11y-missing-attribute -->
          {#if connected}
            <button class="button is-info is-light" disabled>
              {#if heartbeat}
                {Math.round(heartbeat.stats.fps)} fps, {Math.round(heartbeat.stats['cpu-usage'])}% CPU, {heartbeat.stats['output-skipped-frames']} skipped frames
              {:else}Connected{/if}
            </button>
            {#if heartbeat && heartbeat.streaming}
              <button class="button is-danger" on:click={stopStream} title="Stop stream">
                <span class="icon"><Icon path={mdiAccessPointOff} /></span>
                <span>{formatTime(heartbeat.totalStreamTime)}</span>
              </button>
            {:else}
              <button class="button is-danger is-light" on:click={startStream} title="Start stream">
                <span class="icon"><Icon path={mdiAccessPoint} /></span>
              </button>
            {/if}
            {#if heartbeat && heartbeat.recording}
              {#if heartbeat.recordingPaused}
                <button class="button is-danger" on:click={resumeRecording} title="Resume recording">
                  <span class="icon"><Icon path={mdiPlayPause} /></span>
                </button>
              {:else}
                <button class="button is-success" on:click={pauseRecording} title="Pause recording">
                  <span class="icon"><Icon path={mdiPause} /></span>
                </button>
              {/if}
              <button class="button is-danger" on:click={stopRecording} title="Stop recording">
                <span class="icon"><Icon path={mdiStop} /></span>
                <span>{formatTime(heartbeat.totalRecordTime)}</span>
              </button>
            {:else}
              <button class="button is-danger is-light" on:click={startRecording} title="Start recording">
                <span class="icon"><Icon path={mdiRecord} /></span>
              </button>
            {/if}
            <button class:is-light={!isStudioMode} class="button is-link" on:click={toggleStudioMode} title="Toggle Studio Mode">
              <span class="icon"><Icon path={mdiBorderVertical} /></span>
            </button>
            <button class:is-light={!isSceneOnTop} class="button is-link" on:click={switchSceneView} title="Show Scene on Top">
              <span class="icon"><Icon path={mdiArrowSplitHorizontal} /></span>
            </button>
            <button class:is-light={!editable} class="button is-link" title="Edit Scenes" on:click={()=>(editable=!editable)}>
              <span class="icon">
                <Icon path={editable ? mdiImageEditOutline : mdiImageEdit} />
              </span>
            </button>
            <button class:is-light={!isIconMode} class="button is-link" title="Show Scenes as Icons" on:click={()=>(isIconMode=!isIconMode)}>
              <span class="icon">
                <Icon path={isIconMode ? mdiSquareRoundedBadgeOutline : mdiSquareRoundedBadge} />
              </span>
            </button>
            <ProfileSelect />
            <SceneCollectionSelect />
            <button class="button is-danger is-light" on:click={disconnect} title="Disconnect">
              <span class="icon"><Icon path={mdiConnection} /></span>
            </button>
          {:else}
            <button class="button is-danger" disabled>{errorMessage || 'Not connected'}</button>
          {/if}
          <!-- svelte-ignore a11y-missing-attribute -->
          <button class:is-light={!isFullScreen} class="button is-link" on:click={toggleFullScreen} title="Toggle Fullscreen">
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
        <ProgramPreview />
      {/if}
      <SceneSwitcher bind:scenes={scenes} buttonStyle={isIconMode ? "icon" : "text"} editable={editable} />
      {#if !isSceneOnTop}
        <ProgramPreview />
      {/if}
      {#each scenes as scene}
        {#if scene.name.indexOf('(switch)') > 0}
        <SourceSwitcher name={scene.name} buttonStyle="screenshot" />
        {/if}
      {/each}
    {:else}
      <h1 class="subtitle">
        Welcome to
        <strong>OBS-web</strong>
        - the easiest way to control
        <a href="https://obsproject.com/" target="_blank">OBS</a>
        remotely!
      </h1>

      {#if document.location.protocol === 'https:'}
        <div class="notification is-danger">
          You are checking this page on a secure HTTPS connection. That's great, but it means you can
          <strong>only</strong>
          connect to WSS (secure websocket) addresses, for example OBS exposed with
          <a href="https://ngrok.com/">ngrok</a>
          or
          <a href="https://pagekite.net/">pagekite</a>
          . If you want to connect to a local OBS instance,
          <strong>
            <a href="http://{document.location.hostname}{document.location.port ? ':' + document.location.port : ''}{document.location.pathname}">
              please click here to load the non-secure version of this page
            </a>
          </strong>
          .
        </div>
      {/if}

      <p>To get started, enter your OBS host:port below and click "connect".</p>

      <div class="field is-grouped">
        <p class="control is-expanded">
          <input id="host" on:keyup={onKeyup} bind:value={address} class="input" type="text" placeholder="localhost:4444" />
          <input id="password" on:keyup={onKeyup} bind:value={password} class="input" type="password" placeholder="password" />
        </p>
        <p class="control">
          <button on:click={connect} class="button is-success">Connect</button>
        </p>

      </div>
      <p class="help">
        Make sure that the
        <a href="https://github.com/Palakis/obs-websocket/releases" target="_blank">obs-websocket plugin</a>
        is installed and enabled.
      </p>
    {/if}
  </div>

</section>

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
