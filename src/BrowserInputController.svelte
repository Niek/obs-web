<script>
  import { onMount } from 'svelte';
  import { sendCommand } from './obs.js';

  import {
    mdiSubtitles
  } from '@mdi/js'
  import Icon from 'mdi-svelte'

  let showMenu = false;
  let browserInputSetting = {};

  onMount(async function () {
    const data = await sendCommand('GetInputSettings', {
      inputName: "Overlay"
    });
    browserInputSetting = data.inputSettings
  });

  function toggleShowMenu() {
    showMenu = !showMenu;
  }

  async function setBrowserInputSetting() {
    try {
      await sendCommand('SetInputSettings', {
        inputName: 'Overlay',
        inputSettings:{
          url: browserInputSetting.url,
          height: browserInputSetting.height,
          width: browserInputSetting.width
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

<div class="dropdown mx-1 my-1" class:is-active={showMenu}>
  <div class="dropdown-trigger">
    <button
      class="button is-warning"
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
        <textarea
          class="textarea has-fixed-size"
          placeholder="Overlay URL"
          bind:value={browserInputSetting.url}
        />
      </div>
      <hr class="dropdown-divider" />
      <div class="dropdown-item">
        <p class="mb-2">Width</p>
        <input
          class="input"
          type="text"
          placeholder="Width(in pixels)"
          bind:value={browserInputSetting.width}
        />
      </div>
      <div class="dropdown-item">
        <p class="mb-2">Height</p>
        <input
          class="input"
          type="text"
          placeholder="Height(in pixels)"
          bind:value={browserInputSetting.height}
        />
      </div>

      <div class="dropdown-item dropdown-item-right">
        <button class="button is-danger" on:click={setBrowserInputSetting}>保存</button
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