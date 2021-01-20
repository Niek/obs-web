<script>
  const OBS_WEBSOCKET_LATEST_VERSION = '4.8.0'; // https://api.github.com/repos/Palakis/obs-websocket/releases/latest

  // Imports
  import { onMount } from 'svelte';
  import './style.scss';
  import { mdiImageEdit, mdiImageEditOutline, mdiFullscreen, mdiFullscreenExit, mdiBorderVertical, mdiArrowSplitHorizontal, mdiAccessPoint, mdiAccessPointOff, mdiRecord, mdiStop, mdiPause, mdiPlayPause } from '@mdi/js';
  import Icon from 'mdi-svelte';
  import compareVersions from 'compare-versions';

  // Import OBS-websocket
  import OBSWebSocket from 'obs-websocket-js';
  const obs = new OBSWebSocket();

  // Import local components
  import SceneView from './SceneView.svelte';

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

    // Hamburger menu
    const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    if ($navbarBurgers.length > 0) {
      $navbarBurgers.forEach(el => {
        el.addEventListener('click', () => {
          const target = document.getElementById(el.dataset.target);
          el.classList.toggle('is-active');
          target.classList.toggle('is-active');
        });
      });
    }

    if (document.location.hash !== '') {
      // Read host from hash
      host = document.location.hash.slice(1);
      await connect();
    }
  });

  // LocalStorage for IconMode
  let initIconModeState = window.localStorage.getItem('obsdeck') ? window.localStorage.getItem('obsdeck') : null
  let iconCollection = initIconModeState ? JSON.parse(initIconModeState) : {};

  // State
  let connected,
    heartbeat,
    currentScene,
    currentPreviewScene,
    isFullScreen,
    isStudioMode,
    isSceneOnTop,
    isIconMode = initIconModeState ? true : false,
    wakeLock = false;
  let scenes = [];
  let host,
    password,
    errorMessage = '';
  $: sceneChunks = Array(Math.ceil(scenes.length / 4))
    .fill()
    .map((_, index) => index * 4)
    .map(begin => scenes.slice(begin, begin + 4));

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

  function toggleIconModeModal () {
    let modalContainer = document.querySelector('.modal.define-icons');
    if (!modalContainer.classList.contains('is-active')) {
      modalContainer.classList.add('is-active');
    } else {
      modalContainer.classList.remove('is-active');
    }
  }

  function handleFormSubmission() {
    handleIconModeSubmissions(document.getElementById("icon-mode-form"));
  }

  function handleIconModeSubmissions (e) {
    const data = new FormData(e);
    const iconNames = {};
    const iconModeValues = {};
    iconModeValues.isIconMode = isIconMode;

    if (isIconMode) {
      scenes.forEach(item => {
        let name = item.name;
        iconNames[`${name}`] = data.get(`icon-${name.replace(/\s/g, "_")}`).trim();
      });

      iconModeValues.iconNames = iconNames;
      window.localStorage.setItem('obsdeck', JSON.stringify(iconModeValues));
      iconCollection = iconModeValues;
    } else {
      window.localStorage.removeItem('obsdeck');
    }

    toggleIconModeModal();    
  }

  function handleIconCss (background) {
    let styled = `
      height: 64px;
      width: 64px;
      box-shadow: 0 0 5px;
      margin: .5em;
      border-radius: 5px;
      cursor: pointer;
      background: `;
    if (!background) { return styled.concat("white") }
    return background.startsWith('#') ?
      styled.concat(background)
      : styled.concat(`url(${background}) no-repeat center center / cover`);
  }

  // OBS functions
  async function sendCommand(command, params) {
    try {
      return await obs.send(command, params || {});
    } catch (e) {
      console.log('Error sending command', command, ' - error is:', e);
      return {};
    }
  }

  async function setScene(e) {
    await sendCommand('SetCurrentScene', { 'scene-name': e.currentTarget.textContent });
  }

  async function setSceneFromIcon(e) {
    await sendCommand('SetCurrentScene', { 'scene-name': e.currentTarget.getAttribute('iconscene') });
  }

  async function transitionScene(e) {
    await sendCommand('TransitionToProgram');
  }

  async function setPreview(e) {
    await sendCommand('SetPreviewScene', { 'scene-name': e.currentTarget.textContent });
  }
  
  async function setPreviewFromIcon(e) {
    await sendCommand('SetPreviewScene', { 'scene-name': e.currentTarget.getAttribute('iconscene') });
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

  async function updateScenes() {
    let data = await sendCommand('GetSceneList');
    currentScene = data.currentScene;
    scenes = data.scenes.filter(i => {
      return i.name.indexOf('(hidden)') === -1;
    }); // Skip hidden scenes
    if (isStudioMode) {
      obs
        .send('GetPreviewScene')
        .then(data => (currentPreviewScene = data.name))
        .catch(_ => {
          // Switching off studio mode calls SwitchScenes, which will trigger this
          // before the socket has recieved confirmation of disabled studio mode.
        });
    }
    console.log('Scenes updated');
  }

  async function getStudioMode() {
    let data = await sendCommand('GetStudioModeStatus');
    isStudioMode = (data && data.studioMode) || false;
  }

  async function getScreenshot() {
    if (connected) {
      let data = await sendCommand('TakeSourceScreenshot', { sourceName: currentScene, embedPictureFormat: 'png', width: 960, height: 540 });
      if (data && data.img) {
        document.querySelector('#program').src = data.img;
        document.querySelector('#program').className = '';
      }

      if (isStudioMode) {
        let data = await sendCommand('TakeSourceScreenshot', { sourceName: currentPreviewScene, embedPictureFormat: 'png', width: 960, height: 540 });
        if (data && data.img) {
          document.querySelector('#preview').src = data.img;
          document.querySelector('#preview').classList.remove('is-hidden');
        }
      }
    }
    setTimeout(getScreenshot, 1000);
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
    connected = false;
    try {
      await obs.connect({ address: host, password, secure });
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

  async function hostkey(event) {
    if (event.key !== 'Enter') return;
    await connect();
    event.preventDefault();
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
    document.location.hash = host; // For easy bookmarking
    const version = (await sendCommand('GetVersion')).obsWebsocketVersion || '';
    console.log('OBS-websocket version:', version);
    if(compareVersions(version, OBS_WEBSOCKET_LATEST_VERSION) < 0) {
      alert('You are running an outdated OBS-websocket (version ' + version + '), please upgrade to the latest version for full compatibility.');
    }
    await sendCommand('SetHeartbeat', { enable: true });
    await getStudioMode();
    await updateScenes();
    await getScreenshot();
    document.querySelector('#program').classList.remove('is-hidden');
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

  // Scenes
  obs.on('SwitchScenes', async (data) => {
    console.log(`New Active Scene: ${data.sceneName}`);
    await updateScenes();
  });

  obs.on('error', err => {
    console.error('Socket error:', err);
  });

  obs.on('StudioModeSwitched', async (data) => {
    console.log(`Studio Mode: ${data.newState}`);
    isStudioMode = data.newState;
    if (!isStudioMode) {
      currentPreviewScene = false;
    } else {
      await updateScenes();
    }
  });

  obs.on('PreviewSceneChanged', async(data) => {
    console.log(`New Preview Scene: ${data.sceneName}`);
    await updateScenes();
  });
</script>

<svelte:head>
  <title>OBS-web - control OBS from anywhere</title>
</svelte:head>

<nav class="navbar is-primary" role="navigation" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item is-size-4 has-text-weight-bold" href="/">
      <img src="favicon.png" alt="OBS-web" class="rotate" />
      &nbsp; OBS-web
    </a>

    <!-- svelte-ignore a11y-missing-attribute -->
    <a role="button" class="navbar-burger burger" aria-label="menu" aria-expanded="false" data-target="navmenu">
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </a>
  </div>

  <div id="navmenu" class="navbar-menu">
    <div class="navbar-end">
      <div class="navbar-item">
        <div class="buttons">
          <!-- svelte-ignore a11y-missing-attribute -->
          {#if connected}
            <a class="button is-info is-light" disabled>
              {#if heartbeat}
                {Math.round(heartbeat.stats.fps)} fps, {Math.round(heartbeat.stats['cpu-usage'])}% CPU, {heartbeat.stats['output-skipped-frames']} skipped frames
              {:else}Connected{/if}
            </a>
            {#if heartbeat && heartbeat.streaming}
              <a class="button is-danger" on:click={stopStream}>
                <span class="icon">
                  <Icon path={mdiAccessPointOff} />
                </span>
                <span>
                  Stop stream ({heartbeat.totalStreamTime} secs)
                </span>
              </a>
            {:else}
              <a class="button is-danger" on:click={startStream}>
                <span class="icon">
                  <Icon path={mdiAccessPoint} />
                </span>
                <span>
                  Start stream
                </span>
              </a>
            {/if}
            {#if heartbeat && heartbeat.recording}
              {#if heartbeat.recordingPaused}
                <a class="button is-danger" on:click={resumeRecording}>
                  <span class="icon">
                    <Icon path={mdiPlayPause} />
                  </span>
                  <span>
                    Resume recording
                  </span>
                </a>
              {:else}
              <a class="button is-danger" on:click={pauseRecording}>
                <span class="icon">
                  <Icon path={mdiPause} />
                </span>
                <span>
                  Pause recording
                </span>
              </a>
              {/if}
              <a class="button is-danger" on:click={stopRecording}>
                <span class="icon">
                  <Icon path={mdiStop} />
                </span>
                <span>
                  Stop recording ({heartbeat.totalRecordTime} secs)
                </span>
              </a>
              {:else}
              <a class="button is-danger" on:click={startRecording}>
                <span class="icon">
                  <Icon path={mdiRecord} />
                </span>
                <span>
                  Start recording
                </span>
              </a>
            {/if}
            <a class="button is-danger is-light" on:click={disconnect}>Disconnect</a>
            <a class:is-light={!isStudioMode} class="button is-link" on:click={toggleStudioMode} title="Toggle Studio Mode">
              <span class="icon">
                <Icon path={mdiBorderVertical} />
              </span>
            </a>
            <a class:is-light={!isSceneOnTop} class="button is-link" on:click={switchSceneView} title="Show Scene on Top">
              <span class="icon">
                <Icon path={mdiArrowSplitHorizontal} />
              </span>
            </a>
            <a class:is-light={!isIconMode} class="button is-link" title="Edit IconMode" on:click={toggleIconModeModal}>
              <span class="icon">
                <Icon path={isIconMode ? mdiImageEditOutline : mdiImageEdit} />
              </span>
            </a>
          {:else}
            <a class="button is-danger" disabled>{errorMessage || 'Not connected'}</a>
          {/if}
          <!-- svelte-ignore a11y-missing-attribute -->
          <a class:is-light={!isFullScreen} class="button is-link" on:click={toggleFullScreen} title="Toggle Fullscreen">
            <span class="icon">
              <Icon path={isFullScreen ? mdiFullscreenExit : mdiFullscreen} />
            </span>
          </a>
        </div>
      </div>
    </div>
  </div>
</nav>

<section class="section">
  <div class="container">
    {#if connected}
      {#if isSceneOnTop}
        <SceneView isStudioMode={isStudioMode} transitionScene={transitionScene}/>
      {/if}
      {#if isIconMode}
        <div class="is-flex is-flex-grow-1 is-flex-wrap-wrap is-justify-content-center">
          {#each scenes as sc}
            {#if currentScene == sc.name}
              <div
                style="{handleIconCss(Object.keys(iconCollection).length === 0 ? '' : iconCollection.iconNames[sc.name])}; pointer-events: none; opacity: .7; position: relative;"
                iconscene={sc.name}
                title={sc.name}
              >
                <div style="position:absolute; height:10px; width: 10px; background-color: red; border-radius: 50%;right: -3px;top: -3px;" />
              </div>
            {:else if currentPreviewScene == sc.name}
              <div
                style="{handleIconCss(Object.keys(iconCollection).length === 0 ? '' : iconCollection.iconNames[sc.name])};"
                on:click={setSceneFromIcon}
                iconscene={sc.name}
                title={sc.name}
              />
            {:else}
              <div
                style="{handleIconCss(Object.keys(iconCollection).length === 0 ? '' : iconCollection.iconNames[sc.name])};"
                on:click={isStudioMode ? setPreviewFromIcon : setSceneFromIcon}
                iconscene={sc.name}
                title={sc.name}
              />
            {/if}
          {/each}
        </div>
      {:else}
        {#each sceneChunks as chunk}
          <div class="tile is-ancestor">
            {#each chunk as sc}
              <div class="tile is-parent">
                <!-- svelte-ignore a11y-missing-attribute -->
                {#if currentScene == sc.name}
                  <a class="tile is-child is-primary notification">
                    <p class="title has-text-centered is-size-6-mobile">{sc.name}</p>
                  </a>
                {:else if currentPreviewScene == sc.name}
                  <a on:click={setScene} class="tile is-child is-warning notification">
                    <p class="title has-text-centered is-size-6-mobile">{sc.name}</p>
                  </a>
                {:else}
                  <a on:click={isStudioMode ? setPreview : setScene} class="tile is-child is-info notification">
                    <p class="title has-text-centered is-size-6-mobile">{sc.name}</p>
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      {/if}
      {#if !isSceneOnTop}
        <SceneView isStudioMode={isStudioMode} transitionScene={transitionScene}/>
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

  <!-- IconMode Modal -->
  <div class="modal define-icons">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Icon Editor</p>
        <button class="delete" aria-label="close" on:click={toggleIconModeModal}></button>
      </header>
      <section class="modal-card-body">
        <form id="icon-mode-form">
          <div class="show-icons">        
            <div class="field">
              <div class="control">
                <p>Show smaller scene buttons with icon covers:</p>
                <label class="radio">
                  <input type=radio bind:group={isIconMode} value={true}>
                  Yes
                </label>
                <label class="radio">
                  <input type=radio bind:group={isIconMode} value={false}>
                  No
                </label>
              </div>
            </div>
          </div>
          <br>
          {#if isIconMode}
            <div class="scene-list">
              {#each scenes as sc}
                <div class="field">
                  <label
                    class="label"
                    for="icon-{sc.name.replace(/\s/g, "_")}"
                  >{sc.name}</label>
                  <div class="control">
                    <input
                      class="input"
                      type="text"
                      name="icon-{sc.name.replace(/\s/g, "_")}"
                      id="icon-{sc.name.replace(/\s/g, "_")}"
                      placeholder="e.g., 'https://www.images.com/{sc.name}.png' or '#800000'"
                      value={Object.keys(iconCollection).length === 0 ? '' : iconCollection.iconNames[sc.name] ? iconCollection.iconNames[sc.name] : ''}
                    >
                  </div>
                  <p class="help">Enter an icon cover URL or color hex (with hash) for your "{sc.name}" scene.</p>
                </div>
              {/each}
            </div>
          {/if}
        </form>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" on:click={handleFormSubmission}>Save changes</button>
      </footer>
    </div>
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
