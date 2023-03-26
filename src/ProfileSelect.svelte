<script>
  import { onMount } from 'svelte'
  import { obs, sendCommand } from './obs.js'
  import isSettingsLocked from './App.svelte'

  let profiles = []
  let currentProfile = ''

  onMount(async function () {
    const data = await sendCommand('GetProfileList')
    profiles = data.profiles || []
    currentProfile = data.currentProfileName || ''
  })

  obs.on('CurrentProfileChanged', async (data) => {
    console.log('CurrentProfileChanged', data.profileName)
    currentProfile = data.profileName || ''
  })
  obs.on('ProfileListChanged', async (data) => {
    console.log('ProfileListChanged', data.profiles.length)
    profiles = data.profiles || []
  })

  async function setCurrentProfile (event) {
    sendCommand('SetCurrentProfile', { profileName: event.target.value })
  }
</script>

<div class="select" style="margin: 0 .5rem .5rem 0;">
  <select bind:value={currentProfile} title="Change Profile" on:change={setCurrentProfile} disabled={isSettingsLocked}>
  {#each profiles as profile}
    <option value={profile}>{profile}</option>
  {/each}
  </select>
</div>
