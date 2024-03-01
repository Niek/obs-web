<script>
  import { onMount } from 'svelte';
  import { sendCommand } from './obs.js';

  import {
    mdiSubtitles
  } from '@mdi/js'
  import Icon from 'mdi-svelte'

  const overlaySystemPrefix = 'https://tatooine-nu.vercel.app/'
  const overlaySystemControllerPrefix = '/controller'
  let showMenu = false;
  let overlayUrl = '';
  let overlayId = '';

  onMount(async function () {
    const data = await sendCommand('GetInputSettings', {
      inputName: "Overlay"
    });

    overlayUrl = data.inputSettings.url;
    overlayId = extractIdFromURL(overlayUrl)
  });

  function toggleShowMenu() {
    showMenu = !showMenu;
  }

  function extractIdFromURL(url) {
    if (!url.startsWith(overlaySystemPrefix)) {
        console.error('URL does not start with the expected prefix:', overlaySystemPrefix);
        return 'INPUT ERROR';
    }
    return url.substring(overlaySystemPrefix.length);
}

  async function setBrowserInputSetting() {
    overlayId = overlayId
    overlayUrl = `${overlaySystemPrefix}${overlayId}`

    try {
      await sendCommand('SetInputSettings', {
        inputName: 'Overlay',
        inputSettings:{
          url: `${overlaySystemPrefix}${overlayId}`
        },
        overlay: true
      });


      alert('Browser settings have been successfully updated.');
    } catch (error) {
      alert('ERROR: Update streaming server setting failed.');
    }
    showMenu = false;
  }
</script>

<div class="dropdown {showMenu ? 'is-active' : ''}">
  <div class="dropdown-trigger">
    <button
      class="button is-info mr-2"
      class:is-light={showMenu}
      aria-haspopup="true"
      aria-controls="browser-input-setting-dropdown-menu"
      on:click={toggleShowMenu}
    >
      <span class="icon"><Icon path={mdiSubtitles} /></span>
    </button>
  </div>
  <div class="dropdown-menu" id="browser-input-setting-dropdown-menu" role="menu">
    <div class="dropdown-content">
      <div class="dropdown-item">
        <p class="mb-2">Overlay URL</p>
        <input
        class="input is-info"
        type="text"
          placeholder="Overlay ID"
          bind:value={overlayId}
        />
      </div>
      <div class="dropdown-item dropdown-item-right">
        <button class="button is-danger" on:click={setBrowserInputSetting}>保存</button
        >
      </div>
      <hr class="dropdown-divider" />
      <iframe title="Overlay Control" src={overlayUrl}{overlaySystemControllerPrefix} width="500" height="660" frameborder="0"></iframe>
      <p class="title is-7 has-text-centered">{overlayUrl}{overlaySystemControllerPrefix}</p>
    </div>
  </div>
</div>

<style>
  .dropdown-item-right {
    text-align: right;
  }
</style>