<script>
  export let buttonStyle = 'screenshot';
  export let name = 'Backgrounds (hidden)';
  let items = [];
  let itemsIndex = {};
  let currentItemName = '';

  import { onMount } from 'svelte';
  import { obs, sendCommand } from './obs.js';
  import SourceButton from './SourceButton.svelte';

  onMount(async function() {
    await refreshItems();
  })

  async function refreshItems() {
    let data = await sendCommand('GetSceneItemList', {"sceneName": name});
    items = data.sceneItems || items;
    console.log('GetSceneItemList', items.length);
    await fillItems();
  }

  async function fillItems() {
    for (var i=0; i<items.length; i++) {
      let data = await sendCommand('GetSceneItemProperties', {"scene-name": name, "item": items[i].sourceName});
      console.log('GetSceneItemProperties', data.name);
      items[i] = data;
      itemsIndex[data.name] = i;
      if (data.visible) {
        currentItemName = data.name;
      }
    }
  }
  
  obs.on('SceneItemVisibilityChanged', async(data) => {
    if (data['scene-name'] == name) {
      items[itemsIndex[data['item-name']]].visible = data['item-visible'];
    }
  })

  obs.on('SourceOrderChanged', async(data) => {
    console.log('SourceOrderChanged', data);
    if (data['scene-name'] == name) {
      await refreshItems();
    }
  })

  obs.on('SceneItemAdded', async(data) => {
    console.log('SceneItemAdded', data);
    if (data['scene-name'] == name) {
      await refreshItems();
    }
  })

  obs.on('SceneItemRemoved', async(data) => {
    console.log('SceneItemRemoved', data);
    if (data['scene-name'] == name) {
      await refreshItems();
    }
  })

  function backgroundClicker(itemName) {
    return async function() {
      await sendCommand('SetSceneItemProperties', {
        'scene-name': name,
        'item': itemName,
        'visible': true,
      });
      if (currentItemName != itemName){
        await sendCommand('SetSceneItemProperties', {
          'scene-name': name,
          'item': currentItemName,
          'visible': false,
        });
      }
      currentItemName = itemName;
    }
  }
</script>

<ol>
  {#each items as item}
  <li>
    <SourceButton name={item.name}
      on:click={backgroundClicker(item.name)}
      isProgram={item.visible}
      buttonStyle={buttonStyle}
    />
  </li>
  {/each}
</ol>

<style>
  ol {
    list-style: None;
    display: flex;
    flex-wrap: wrap;
    align-content: space-between;
    gap: .5rem;
    margin-bottom: 2rem;
  }
  li {
    max-width: 192px;
    white-space: nowrap;
  }
</style>