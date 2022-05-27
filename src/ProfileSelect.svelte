<script>
  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';

  let profiles = [],
    currentProfile = '';

  onMount(async function(){
    let data = await sendCommand('ListProfiles');
    profiles = (data.profiles || []).map(p => p['profile-name']);
    data = await sendCommand('GetCurrentProfile');
    currentProfile = data['profile-name'] || '';
  })

  obs.on('ProfileChanged', async (data) => {
    console.log('ProfileChanged', data.profile);
    currentProfile = data.profile || '';
  });
  obs.on('ProfileListChanged', async (data) => {
    console.log('ProfileListChanged', data.profiles.length);
    profiles = (data.profiles || []).map(p => p.name);
  });

  async function setCurrentProfile(event) {
    sendCommand('SetCurrentProfile', {'profile-name': event.target.value});
  }
</script>

<div class="select" style="margin: 0 .5rem .5rem 0;">
  <select bind:value={currentProfile} title="Change profile" on:change={setCurrentProfile}>
  {#each profiles as profile}
    <option value={profile}>{profile}</option>
  {/each}
  </select>
</div>
