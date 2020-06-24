<script>
  // Imports
  import { onMount } from 'svelte';
  import './style.scss';
  import { mdiFullscreen, mdiFullscreenExit } from '@mdi/js';
  import Icon from 'mdi-svelte';

  // Import OBS-websocket
  import OBSWebSocket from 'obs-websocket-js';
  const obs = new OBSWebSocket();

  onMount(async () => {
    // Request screen wakelock
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');

      // Re-request when coming back
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          wakeLock = navigator.wakeLock.request('screen');
        }
      });
    }

    // Hamburger menu
    const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    if ($navbarBurgers.length > 0) {
      $navbarBurgers.forEach(el => {
        el.addEventListener('click', () => {
          const target = el.dataset.target;
          const $target = document.getElementById(target);
          el.classList.toggle('is-active');
          $target.classList.toggle('is-active');
        });
      });
    }

    if (document.location.hash != '') {
      // Read host from hash
      host = document.location.hash.slice(1);
      await connect();
    }
  });

  // State
  let connected,
    heartbeat,
    currentScene,
    isFullScreen,
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
      document.exitFullscreen && document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    }
    isFullScreen = !isFullScreen;
  }

  // OBS functions
  async function setScene(e) {
    await obs.send('SetCurrentScene', { 'scene-name': e.currentTarget.textContent });
  }

  async function startStream() {
    await obs.send('StartStreaming');
  }

  async function stopStream() {
    await obs.send('StopStreaming');
  }

  async function updateScenes() {
    let data = await obs.send('GetSceneList');
    currentScene = data.currentScene;
    scenes = data.scenes.filter(i => {
      return i.name.indexOf('(hidden)') === -1;
    }); // Skip hidden scenes
    console.log('Scenes updated');
  }

  async function getScreenshot() {
    if (connected) {
      let data = await obs.send('TakeSourceScreenshot', { sourceName: currentScene, embedPictureFormat: 'jpeg', width: 960, height: 540 });
      if (data.img) {
        document.querySelector('#preview').src = data.img;
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
      host = url.hostname + ':' + (url.port ? url.port : (secure ? 443 : 80));
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
    await obs.send('SetHeartbeat', { enable: true });
    await updateScenes();
    await getScreenshot();
    document.querySelector('#preview').classList.remove('is-hidden');
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
  obs.on('SwitchScenes', data => {
    console.log(`New Active Scene: ${data.sceneName}`);
    updateScenes();
  });

  obs.on('error', err => {
    console.error('Socket error:', err);
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
          <a class="button is-link is-light" on:click={toggleFullScreen} title="Toggle fullscreen">
            <span class="icon">
              <Icon path={isFullScreen ? mdiFullscreenExit : mdiFullscreen} />
            </span>
          </a>
          <!-- svelte-ignore a11y-missing-attribute -->
          {#if connected}
            <a class="button is-info is-light" disabled>
              {#if heartbeat}
                {Math.round(heartbeat.stats.fps)} fps, {Math.round(heartbeat.stats['cpu-usage'])}% CPU, {heartbeat.stats['output-skipped-frames']} skipped frames
              {:else}Connected{/if}
            </a>
            {#if heartbeat && heartbeat.streaming}
              <a class="button is-danger" on:click={stopStream}>Stop stream ({heartbeat.totalStreamTime} secs)</a>
            {:else}
              <a class="button is-danger" on:click={startStream}>Start stream</a>
            {/if}
            <a class="button is-danger is-light" on:click={disconnect}>Disconnect</a>
          {:else}
            <a class="button is-danger" disabled>{errorMessage || 'Not connected'}</a>
          {/if}
        </div>
      </div>
    </div>
  </div>
</nav>

<section class="section">
  <div class="container">
    {#if connected}
      {#each sceneChunks as chunk}
        <div class="tile is-ancestor">
          {#each chunk as sc}
            <div class="tile is-parent">
              <!-- svelte-ignore a11y-missing-attribute -->
              <a on:click={setScene} class="tile is-child {currentScene == sc.name ? 'is-primary' : 'is-info'} notification">
                <p class="title has-text-centered">{sc.name}</p>
              </a>
            </div>
          {/each}
        </div>
      {/each}
      <div class="columns is-centered">
        <div class="column is-half has-text-centered">
          <img id="preview" alt="Preview" class="is-hidden" />
        </div>
      </div>
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
