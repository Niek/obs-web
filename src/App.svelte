<script>
  // Import SCSS
  import './style.scss';

  // Import OBS-websocket
  import OBSWebSocket from 'obs-websocket-js';
  const obs = new OBSWebSocket();

  // State
  let connected,
    heartbeat,
    currentScene = false;
  let scenes = [];
  $: sceneChunks = Array(Math.ceil(scenes.length / 4))
    .fill()
    .map((_, index) => index * 4)
    .map(begin => scenes.slice(begin, begin + 4));

  async function setScene(e) {
    await obs.send('SetCurrentScene', { 'scene-name': e.currentTarget.innerText });
  }

  async function startStream() {
    await obs.send('StartStreaming');
  }

  async function stopStream() {
    await obs.send('StopStreaming');
  }

  async function getScreenshot() {
    if (connected) {
      let data = await obs.send('TakeSourceScreenshot', { sourceName: currentScene, embedPictureFormat: 'jpeg', width: 960, height: 540 });
      if (data.img) {
        document.querySelector('#preview').classList.remove('is-hidden');
        document.querySelector('#preview').src = data.img;
      }
    }
    setTimeout(getScreenshot, 1000);
  }

  document.addEventListener('DOMContentLoaded', () => {
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

    // Connect
    document.querySelector('#connect').addEventListener('click', async () => {
      const host = document.querySelector('#host').value || 'localhost:4444';
      console.log('Connecting to: ' + host);
      await obs.disconnect();
      connected = false;
      await obs.connect({ address: host, secure: location.protocol === 'https:' });
      console.log('Connected');
      connected = true;
      await obs.send('SetHeartbeat', { enable: true });
      await updateScenes();
      await getScreenshot();
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

    async function updateScenes() {
      let data = await obs.send('GetSceneList');
      currentScene = data.currentScene;
      scenes = data.scenes;
      console.log('Scenes updated');
    }

    // Handle enter key
    document.querySelector('#host').addEventListener('keyup', event => {
      if (event.key !== 'Enter') return;
      document.querySelector('#connect').click();
      event.preventDefault();
    });
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
          {#if connected}
            <a class="button is-info is-light" id="info" disabled>
              {#if heartbeat}
                {Math.round(heartbeat.stats.fps)} fps, {Math.round(heartbeat.stats['cpu-usage'])}% CPU, {heartbeat.stats['output-skipped-frames']} skipped frames
              {:else}Connected{/if}
            </a>
            {#if heartbeat && heartbeat.streaming}
              <a class="button is-danger" id="stream" on:click={stopStream}>Stop stream ({heartbeat.totalStreamTime} secs)</a>
            {:else}
              <a class="button is-danger" id="stream" on:click={startStream}>Start stream</a>
            {/if}
          {:else}
            <a class="button is-info is-light" id="info" disabled>Not connected</a>
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
        - the easiest way to control OBS remotely!
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
            <a href=http://{document.location.hostname}{document.location.port ? ':' + document.location.port : ''}{document.location.pathname}>please click here to load the non-secure version of this page</a>
          </strong>
          .
        </div>
      {/if}

      <p>To get started, enter your OBS host below and click "connect".</p>

      <div class="field is-grouped">
        <p class="control is-expanded">
          <input id="host" class="input" type="text" placeholder="localhost:4444" />
        </p>
        <p class="control">
          <button id="connect" class="button is-success">Connect</button>
        </p>
      </div>
    {/if}
  </div>

</section>

<footer class="footer">
  <div class="content has-text-centered">
    <p>
      <strong>OBS-web</strong>
      by
      <a href="https://niekvandermaas.nl/">Niek van der Maas</a>
      . See
      <a href="https://github.com/Niek/obs-web">GitHub</a>
      for source code.
    </p>
  </div>
</footer>
