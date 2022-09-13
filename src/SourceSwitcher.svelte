<script>
  export let buttonStyle = 'screenshot'
  export let name = 'Backgrounds (hidden)'
  export let imageFormat = 'jpg'
  let items = []
  const itemsIndex = {}
  let currentItemId = ''
  const screenshottedIds = new Set()

  import { onMount } from 'svelte'
  import { obs, sendCommand } from './obs.js'
  import SourceButton from './SourceButton.svelte'

  onMount(async function () {
    await refreshItems()
  })

  async function refreshItems () {
    const data = await sendCommand('GetSceneItemList', { sceneName: name })
    items = data.sceneItems || items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      itemsIndex[item.sceneItemId] = i
      if (item.sceneItemEnabled) {
        currentItemId = item.sceneItemId
      }
    }
    for (let i = 0; i < items.length; i++) {
      items[i].img = await getItemScreenshot(items[i])
    }
  }

  obs.on('SceneItemEnableStateChanged', async (data) => {
    if (data.sceneName === name) {
      const i = itemsIndex[data.sceneItemId]
      items[i].sceneItemEnabled = data.sceneItemEnabled
      if (items[i].sceneItemEnabled && !items[i].img) {
        items[i].img = await getItemScreenshot(items[i])
        if (screenshottedIds.has(items[i].sceneItemId)) {
          items[i].img = await getItemScreenshot(items[i])
          await sendCommand('SetSceneItemEnabled', {
            sceneName: name,
            sceneItemId: items[i].sceneItemId,
            sceneItemEnabled: false
          })
          screenshottedIds.delete(items[i].sceneItemId)
        }
      }
    }
  })

  obs.on('SceneItemListReindexed', async (data) => {
    if (data.sceneName === name) {
      await refreshItems()
    }
  })

  obs.on('SceneItemCreated', async (data) => {
    if (data.sceneName === name) {
      await refreshItems()
    }
  })

  obs.on('SceneItemRemoved', async (data) => {
    if (data.sceneName === name) {
      await refreshItems()
    }
  })

  function backgroundClicker (itemId) {
    return async function () {
      await sendCommand('SetSceneItemEnabled', {
        sceneName: name,
        sceneItemId: itemId,
        sceneItemEnabled: true
      })
      if (currentItemId !== itemId) {
        await sendCommand('SetSceneItemEnabled', {
          sceneName: name,
          sceneItemId: currentItemId,
          sceneItemEnabled: false
        })
      }
      currentItemId = itemId
    }
  }

  async function getItemScreenshot (item) {
    if (item.img) return item.img
    let data = null
    let retry = item.sceneItemEnabled ? 3 : 1
    while (retry--) {
      // Random sleep to avoid burst of thumbnail rendering
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 100))
      data = await sendCommand('GetSourceScreenshot', {
        sourceName: item.sourceName,
        imageFormat,
        width: 192,
        height: 108
      })
      if (data && data.imageData) {
        return data.imageData
      }
    }
  }

  async function loadMissingScreenshots () {
    for (let i = 0; i < items.length; i++) {
      if (!items[i].img) {
        await sendCommand('SetSceneItemEnabled', {
          sceneName: name,
          sceneItemId: items[i].sceneItemId,
          sceneItemEnabled: true
        })
        screenshottedIds.add(items[i].sceneItemId)
      }
    }
  }
</script>

<ol>
  {#each items as item}
  <li>
    <SourceButton name={item.sourceName}
      on:click={backgroundClicker(item.sceneItemId)}
      isProgram={item.sceneItemEnabled}
      img={item.img}
      buttonStyle={buttonStyle}
    />
  </li>
  {/each}
</ol>
<button class="button" on:click={loadMissingScreenshots}>Load missing thumbnails</button>

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
