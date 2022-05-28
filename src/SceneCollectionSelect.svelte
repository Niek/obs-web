<script>
  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';

  let collections = [],
    currentCollection = '';

  onMount(async function(){
    let data = await sendCommand('ListSceneCollections');
    collections = (data['scene-collections'] || []).map(p => p['sc-name']);
    data = await sendCommand('GetCurrentSceneCollection');
    currentCollection = data['sc-name'] || '';
  })

  obs.on('SceneCollectionChanged', async (data) => {
    console.log('SceneCollectionChanged', data.sceneCollection);
    currentCollection = data.sceneCollection || '';
  });
  obs.on('SceneCollectionListChanged', async (data) => {
    console.log('SceneCollectionListChanged', data.sceneCollections.length);
    collections = (data.sceneCollections || []).map(p => p.name);
  });

  async function setCurrentCollection(event) {
    sendCommand('SetCurrentSceneCollection', {'sc-name': event.target.value});
  }
</script>

<div class="select" style="margin: 0 .5rem .5rem 0;">
  <select bind:value={currentCollection} title="Change Collection" on:change={setCurrentCollection}>
  {#each collections as collection}
    <option value={collection}>{collection}</option>
  {/each}
  </select>
</div>
