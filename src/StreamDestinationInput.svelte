<script>
  import { onMount } from 'svelte';
  import { sendCommand } from './obs.js';
  import {
    mdiEarthArrowUp
  } from '@mdi/js'
  import Icon from 'mdi-svelte'

  export let uiLock = false;
  let showMenu = false;
  let useAuthentication = false;
  let streamServiceSettings = {};

  onMount(async function () {
    const data = await sendCommand('GetStreamServiceSettings');
    console.log(data);
    streamServiceSettings = data.streamServiceSettings;
  });

  function toggleShowMenu() {
    showMenu = !showMenu;
  }

  async function setStreamingServiceSetting() {
    try {
      await sendCommand('SetStreamServiceSettings', {
        streamServiceType: 'rtmp_custom',
        streamServiceSettings: {
          server: streamServiceSettings.server,
          key: streamServiceSettings.key,
          use_auth: useAuthentication,
          username: useAuthentication ? streamServiceSettings.username : '',
          password: useAuthentication ? streamServiceSettings.password : '',
        },
      });
      alert('The streaming server settings have been successfully updated.');
    } catch (error) {
      alert('ERROR: Update streaming server setting failed.');
    }
    showMenu = false
  }
</script>

<div class="dropdown mx-1 my-1 {showMenu ? 'is-active' : ''} {uiLock ? 'is-locked' : ''}">
  <div class="dropdown-trigger">
    <button
      class="button is-warning"
      class:is-light={showMenu}
      aria-haspopup="true"
      aria-controls="streaming-setting-dropdown-menu"
      on:click={toggleShowMenu}
    >
      <span class="icon"><Icon path={mdiEarthArrowUp} /></span>
    </button>
  </div>
  <div class="dropdown-menu" id="streaming-setting-dropdown-menu" role="menu">
    <div class="dropdown-content">
      <div class="dropdown-item">
        <p class="mb-2">Server</p>
        <textarea
          class="textarea has-fixed-size"
          type="text"
          placeholder="Destination URL"
          bind:value={streamServiceSettings.server}
        />
      </div>
      <hr class="dropdown-divider" />
      <div class="dropdown-item">
        <p class="mb-2">Stream Key</p>
        <input
          class="input"
          type="text"
          placeholder="Stream Key"
          bind:value={streamServiceSettings.key}
        />
      </div>
      <hr class="dropdown-divider" />
      <div class="dropdown-item">
        <label class="checkbox">
          Use authentication
          <input type="checkbox" bind:checked={useAuthentication} />
        </label>
      </div>
      <div class="dropdown-item">
        <input
          class="input is-normal mb-2"
          type="text"
          placeholder="Username"
          disabled={!useAuthentication}
          bind:value={streamServiceSettings.username}
        />
        <input
          class="input is-normal"
          type="password"
          placeholder="Password"
          disabled={!useAuthentication}
          bind:value={streamServiceSettings.password}
        />
      </div>
      <div class="dropdown-item dropdown-item-right">
        <button class="button is-danger" on:click={setStreamingServiceSetting}
          >保存</button
        >
      </div>
    </div>
  </div>
</div>

<style>
  .dropdown-item-right {
    text-align: right;
  }
</style>
