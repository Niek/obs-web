<script>
  const OBS_WEBSOCKET_LATEST_VERSION = '4.8.0'; // https://api.github.com/repos/Palakis/obs-websocket/releases/latest

  // Imports
  import { onMount } from 'svelte';
  import './style.scss';
  import { mdiFullscreen, mdiFullscreenExit, mdiBorderVertical, mdiArrowSplitHorizontal, mdiAccessPoint, mdiAccessPointOff, mdiRecord, mdiStop, mdiPause, mdiPlayPause } from '@mdi/js';
  import Icon from 'mdi-svelte';
  import compareVersions from 'compare-versions';

  import { obs, sendCommand } from './obs.js';
  import ProgramPreview from './ProgramPreview.svelte';
  import SourceButton from './SourceButton.svelte';

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      // navigator.serviceWorker.register('/service-worker.js');
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
      // Read host from hash
      host = document.location.hash.slice(1);
      await connect();
    }
  });

  // State
  let connected,
    heartbeat,
    programScene,
    previewScene,
    isFullScreen,
    isStudioMode,
    isSceneOnTop,
    wakeLock = false;
  let scenes = [];
  let sceneItems = [];
  let sources = {};
  let backgroundsScene = 'Pozadia';
  let backgroundName;
  let backgrounds = [];
  let host,
    password,
    errorMessage = '';

  sources[programScene] = {items: []}
  sources[backgroundsScene] = {items: []}

  $: sceneItems = sources[programScene].items || [];
  $: updateSceneItems(sceneItems);
  $: backgrounds = sources[backgroundsScene].items || [];
  $: updateSceneItems(backgrounds);

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

  function sceneClicker(sceneName) {
    return async function() {
      if (isStudioMode) {
        await sendCommand('SetPreviewScene', { 'scene-name': sceneName });
      } else {
        await sendCommand('SetCurrentScene', { 'scene-name': sceneName });
      }
    }
  }

  function backgroundClicker(name) {
    return async function() {
      await sendCommand('SetSceneItemProperties', {
        'scene-name': backgroundsScene,
        'item': name,
        'visible': true,
      });
      await sendCommand('SetSceneItemProperties', {
        'scene-name': backgroundsScene,
        'item': backgroundName,
        'visible': false,
      });
      backgroundName = name;
    }
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
    host = host || 'localhost:4444';
    let secure = location.protocol === 'https:' || host.endsWith(':443');
    if (host.indexOf('://') !== -1) {
      let url = new URL(host);
      secure = url.protocol === 'wss:' || url.protocol === 'https:';
      host = url.hostname + ':' + (url.port ? url.port : secure ? 443 : 80);
    }
    console.log('Connecting to:', host, '- secure:', secure, '- using password:', password);
    await disconnect();
    try {
      await obs.connect({ address: host, password, secure });
    } catch (e) {
      console.log(e);
      errorMessage = e.description;
    }
  }

  async function disconnect() {
    obs.disconnect();
    connected = false;
    errorMessage = 'Disconnected';
  }

  async function hostkey(event) {
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

  function sceneFilter(scene) {
    // Skip hidden scenes
    sources[scene.name] = scene;
    return scene.name.indexOf('(hidden)') === -1;
  }

  obs.on('AuthenticationSuccess', async () => {
    console.log('Connected');
    connected = true;
    document.location.hash = host; // For easy bookmarking
    const version = (await sendCommand('GetVersion')).obsWebsocketVersion || '';
    console.log('OBS-websocket version:', version);
    if(compareVersions(version, OBS_WEBSOCKET_LATEST_VERSION) < 0) {
      alert('You are running an outdated OBS-websocket (version ' + version + '), please upgrade to the latest version for full compatibility.');
    }
    await sendCommand('SetHeartbeat', { enable: true });
    sendCommand('GetStudioModeStatus').then(data => {
      isStudioMode = (data && data.studioMode) || false;
    });
    let data = await sendCommand('GetSceneList');
    programScene = data.currentScene;
    scenes = data.scenes.filter(sceneFilter);
    console.log('GetSceneList', programScene);
    await updateSceneItemList();
  });

  obs.on('AuthenticationFailure', async () => {
    password = prompt('Please enter your password:', password);
    if (password === null) {
      connected = false;
      password = '';
    } else {
      await connect();
    }
  });

  // Heartbeat
  obs.on('Heartbeat', data => {
    heartbeat = data;
  });

  obs.on('error', err => {
    console.error('Socket error:', err);
  });

  // Scenes
  obs.on('SwitchScenes', async (data) => {
    console.log('New Active Scene:', data.sceneName);
    const items = data.sources || [];
    for (const item of items) {
      if (!sources[item.name])
      sources[item.name] = {name: item.name};
    }
    sources[data.sceneName].items = items;
    programScene = data.sceneName;
    console.log('SwitchScenes', programScene, data.sources.length);
  });

  obs.on('StudioModeSwitched', async (data) => {
    console.log(`Studio Mode: ${data.newState}`);
    isStudioMode = data.newState;
    previewScene = programScene;
  });

  obs.on('PreviewSceneChanged', async(data) => {
    console.log(`New Preview Scene: ${data.sceneName}`);
    previewScene = data.sceneName;
    const items = data.sources || [];
    for (const item of items) {
      if (!sources[item.name]) {
        sources[item.name] = item;
      }
    }
    sources[data.sceneName].items = items;
    console.log('PreviewSceneChanged', data.sources.length);
  });

  obs.on('ScenesChanged', async(data) => {
    scenes = data.scenes.filter(sceneFilter);
    console.log('ScenesChanged', scenes.length);
  });

  async function updateSceneItemList(name) {
    if (!name) name = programScene;
    let data = await sendCommand('GetSceneItemList', {sceneName: name});
    console.log('GetSceneItemList', data.sceneItems.length, 'items');
    for (const item of data.sceneItems) {
      item.name = item.name || item.sourceName;
      if (!sources[item.sourceName]) {
        sources[item.sourceName] = {name: item.name};
      }
    }
    sources[name].items = data.sceneItems || [];
  }

  async function updateSceneItems(items) {
    for (const item of items) {
      if (!sources[item.name]) {
        sources[item.name] = {name: item.name};
      }
      if (!sources[item.name].img) {
        sources[item.name].img = await getSourceThumbnail(item.name);
      }
      if (item.visible) {
        backgroundName = item.name;
      }
    }
  }

  async function getSourceThumbnail(name) {
    console.log('TakeSourceScreenshot', name);
    let data = await sendCommand('TakeSourceScreenshot', {
      sourceName: name,
      embedPictureFormat: 'jpg',
      width: 192,
      height: 108,
    });
    return data.img;
  }
</script>

<svelte:head>
  <title>OBS-web - control OBS from anywhere</title>
</svelte:head>

<nav class="navbar is-primary" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item is-size-4 has-text-weight-bold" href="/">
      <img src="favicon.png" alt="OBS-web" class="rotate" />
      &nbsp; OBS-web
    </a>

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
              <button class="button is-danger" on:click={stopStream}>
                <span class="icon"><Icon path={mdiAccessPointOff} /></span>
                <span>Stop stream ({heartbeat.totalStreamTime} secs)</span>
              </button>
            {:else}
              <button class="button is-danger" on:click={startStream}>
                <span class="icon"><Icon path={mdiAccessPoint} /></span>
                <span>Start stream</span>
              </button>
            {/if}
            {#if heartbeat && heartbeat.recording}
              {#if heartbeat.recordingPaused}
                <button class="button is-danger" on:click={resumeRecording}>
                  <span class="icon"><Icon path={mdiPlayPause} /></span>
                  <span>Resume recording</span>
                </button>
              {:else}
              <button class="button is-danger" on:click={pauseRecording}>
                <span class="icon"><Icon path={mdiPause} /></span>
                <span>Pause recording</span>
              </button>
              {/if}
              <button class="button is-danger" on:click={stopRecording}>
                <span class="icon"><Icon path={mdiStop} /></span>
                <span>
                  Stop recording ({heartbeat.totalRecordTime} secs)
                </span>
              </button>
              {:else}
              <button class="button is-danger" on:click={startRecording}>
                <span class="icon"><Icon path={mdiRecord} /></span>
                <span>Start recording</span>
              </button>
            {/if}
            <button class="button is-danger is-light" on:click={disconnect}>Disconnect</button>
            <button class:is-light={!isStudioMode} class="button is-link" on:click={toggleStudioMode} title="Toggle Studio Mode">
              <span class="icon">
                <Icon path={mdiBorderVertical} />
              </span>
            </button>
            <button class:is-light={!isSceneOnTop} class="button is-link" on:click={switchSceneView} title="Show Scene on Top">
              <span class="icon">
                <Icon path={mdiArrowSplitHorizontal} />
              </span>
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
        <ProgramPreview
          isStudioMode={isStudioMode}
          programScene={programScene}
          previewScene={previewScene}
        />
      {/if}
      <ol style="list-style:none;">
        {#each sceneItems as item}
        <li style="display: inline-block;">
          <SourceButton name={item.name}
            on:click={backgroundClicker(item.name)}
            img={sources[item.name].img}
          />
        </li>
        {/each}
      </ol>
      <ol class="tile is-ancestor">
        {#each scenes as scene}
        <li class="tile is-parent">
          <SourceButton name={scene.name}
            on:click={sceneClicker(scene.name)}
            isProgram={programScene == scene.name}
            isPreview={previewScene == scene.name}
          />
        </li>
        {/each}
      </ol>
      {#if !isSceneOnTop}
        <ProgramPreview
          isStudioMode={isStudioMode}
          programScene={programScene}
          previewScene={previewScene}
        />
      {/if}
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
          connect to WSS (secure websocket) hosts, for example OBS exposed with
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

      <p>To get started, enter your OBS host below and click "connect".</p>

      <div class="field is-grouped">
        <p class="control is-expanded">
          <input id="host" on:keyup={hostkey} bind:value={host} class="input" type="text" placeholder="localhost:4444" />
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
