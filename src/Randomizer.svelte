<script>
    import { onMount } from 'svelte'
    import { obs, sendCommand } from './obs.js'

    import {
    mdiShuffle
  } from '@mdi/js'
  import Icon from 'mdi-svelte'

    const delay = ms => new Promise(res => setTimeout(res, ms));

    let statusrandom = false;
    let previousrandom;
    let delaytime = 5;
    let transitionsmode = '';
    let transitions = []
  
    onMount(async function () {

      let data;
      data = await sendCommand('GetSceneTransitionList')
      transitions = data.transitions || []

      transitionsmode = data.transitions[0].transitionName;

    })

  obs.on('CustomEvent', data => {
    console.log("eventData",data);
    // if (data['eventData']['randomscene'] == 'running') {
    //   statusrandom = true;
    // }
  });

  async function setMode() {
    //console.log(transitionsmode);
  }

  async function setdelay() {
    //delaytime = 1;
    //console.log(delaytime);
  }

  async function RandomScene() {

    if (!statusrandom) {

      //console.log('start --> randomscene');
      statusrandom = true;
      StartRandomScene()
      //await sendCommand('BroadcastCustomMessage', { realm: 'randomscene', data: {randomscene: 'activate'}});

    } else {

      //console.log('stop --> randomscene');
      //await sendCommand('BroadcastCustomMessage', { realm: 'randomscene', data: {randomscene: 'deactivate'}});
      statusrandom = false;
    }

  }

  async function StartRandomScene() {

    while (true) {

      if (statusrandom) {
        let randomness = Math.floor(Math.random() * 4)
        let timeoutrandom = (randomness + parseInt(delaytime)) * 1000;
        console.log('delay set',timeoutrandom/1000, 'randomness', randomness, 'delaytime', delaytime);
        await delay(timeoutrandom);
        //console.log('delay finished');
        GetRandomScene();

      } else {

        break;

      }

    }

  }

  async function GetRandomScene() {
    
    await sendCommand('BroadcastCustomEvent', {eventData: {randomscene: 'active'}});

    let data = await sendCommand('GetSceneList')

    var item = data.scenes[Math.floor(Math.random()*data.scenes.length)];
    if (!previousrandom) previousrandom = item;

    while (item.sceneName == previousrandom.sceneName) {
      var item = data.scenes[Math.floor(Math.random()*data.scenes.length)];
    } 

    await sendCommand('SetCurrentPreviewScene', { 'sceneName': item.sceneName});
    await sendCommand('SetCurrentSceneTransition', { transitionName: transitionsmode })
    await sendCommand('TriggerStudioModeTransition')

    previousrandom = item;

    //await sendCommand('BroadcastCustomEvent', { realm: 'randomscene', eventData: {randomscene: 'active'}});
  
  }
  </script>
  

{#if statusrandom} 
  <button class="button is-danger" on:click={RandomScene} title="Stop Random Scene" >
  <span class="icon"><Icon path={mdiShuffle} /></span>
  </button>
{:else}
  <button class="button is-danger is-light" on:click={RandomScene} title="Random Scene" >
  <span class="icon"><Icon path={mdiShuffle} /></span>
  </button>
{/if}

<div class="button is-info is-light" style="margin: 0 .5rem .5rem 0;">
  <input class="is-info" title="Change Delaytime" bind:value={delaytime} on:change={setdelay} style="line-height: 2.7em;width: 3em;text-align: center;border-top-style: hidden; border-right-style: hidden; border-left-style: hidden; border-bottom-style: hidden; background-color: #eff5fb;">
</div>

<div class="select" style="margin: 0 .5rem .5rem 0;">
  <select bind:value={transitionsmode} title="Change Profile" on:change={setMode}>
    {#each transitions as transition}
      <option value={transition.transitionName}>{transition.transitionName}</option>
    {/each}
  </select>
</div>
