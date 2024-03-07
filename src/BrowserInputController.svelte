<script>
  import { onMount } from 'svelte';
  import { sendCommand } from './obs.js';
  import { mdiSubtitles } from '@mdi/js';
  import Icon from 'mdi-svelte';

  const overlaySystemPrefix = 'https://tatooine-nu.vercel.app/';
  const overlaySystemControllerPrefix = '/controller'
  let showMenu = false;
  let overlayId = '';
  let overlayUrl = '';
  $: toggleButtonRight = showMenu ? '530px' : '0';

  onMount(async () => {
    const data = await sendCommand('GetInputSettings', { inputName: "Overlay" });
    overlayUrl = data.inputSettings.url;
    overlayId = extractIdFromURL(overlayUrl);
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

<div class="menu-container {showMenu ? 'is-active' : ''}">
  <button
    class="button is-info is-medium toggle-button"
    style="right: {toggleButtonRight};"
    on:click={toggleShowMenu}
  >
    <span class="icon"><Icon path={mdiSubtitles} /></span>
  </button>

  <div class="slide-menu">
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
      <div class="dropdown-item">
        <button class="button is-danger" on:click={setBrowserInputSetting}>適用</button>
      </div>
      <hr class="dropdown-divider" />
      <iframe title="Overlay Control" src={overlayUrl}{overlaySystemControllerPrefix} width="500" height="660" frameborder="0"></iframe>
      <p class="title is-7 has-text-centered">{overlayUrl}{overlaySystemControllerPrefix}</p>
    </div>
  </div>
</div>

<style>
  .menu-container {
    position: relative;
  }

  .toggle-button {
    position: fixed;
    right: 0; /* This will be overridden by inline styles */
    top: 50%;
    z-index: 100;
    transform: translateY(-50%);
    transition: right 0.5s; /* Smooth transition for moving the button */
  }

  .slide-menu {
    height: 100%;
    width: 0;
    position: fixed;
    z-index: 100;
    top: 0;
    right: 0;
    overflow-x: hidden;
    transition: 0.5s;
    padding-top: 4rem;
  }

  .menu-container.is-active .slide-menu {
    width: 550px;
  }

  .dropdown-content {
    margin: 25px;
  }

  .dropdown-item:not(:last-child) {
    margin-bottom: 1rem;
  }
</style>
