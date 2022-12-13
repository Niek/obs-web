<script>
    import { onMount } from 'svelte'
    import { obs, sendCommand } from './obs.js'
    import { writable } from '../node_modules/svelte/store'

    import {
    mdiShuffle
    } from '../node_modules/@mdi/js/mdi'
    import Icon from '../node_modules/mdi-svelte'

    const delay = ms => new Promise(res => setTimeout(res, ms));

    let statusrandom = false;
    let previousrandom;
    let delaytime = 5;
    let inputrandomness = 4;
    let transitionsmode;
    let transitions = []
    let client = "user";

    const storeddelay = localStorage.prefsdelay
    if (storeddelay) delaytime = storeddelay

    const storedmode = localStorage.prefsmode
    if (storedmode) transitionsmode = storedmode

    console.log('get storedmode',transitionsmode)

    const storedrandomness = localStorage.prefsrandomness
    if (storedrandomness) inputrandomness = storedrandomness


  
    onMount(async function () {

      let data;
      data = await sendCommand('GetSceneTransitionList')
      transitions = data.transitions || []

      // transitionsmode = data.transitions[0].transitionName;

    })

  obs.on('CustomEvent', data => {
    
    if (data['client'] == 'cli') client = "cli"
    else client = "user"

    transitionsmode = data['transitionsmode'] 
    delaytime = data['delaytime'];
    inputrandomness = data['inputrandomness'];


    if (data['randomizer'] == true) {
      
      statusrandom = true;
      if (client == 'user') StartRandomScene()
      
    } else {
      
      statusrandom = false;
    
    }

  });

  async function setMode() {
    //console.log(transitionsmode);

    const stored = localStorage.prefsmode
    const prefsmode = writable(stored || transitionsmode)
    localStorage.setItem('prefsmode', transitionsmode)

    console.log('save setMode',transitionsmode)

    if (statusrandom) {
      await sendCommand('BroadcastCustomEvent', {eventData: {"delaytime":delaytime,"transitionsmode":transitionsmode,"inputrandomness":inputrandomness,"client":client, "randomizer": statusrandom }});
    }
  }

  async function setdelay() {
    //delaytime = 1;
    //console.log(delaytime);

    const stored = localStorage.prefsdelay
    const prefsdelay = writable(stored || delaytime)
    localStorage.setItem('prefsdelay', delaytime)

    if (statusrandom) {
      await sendCommand('BroadcastCustomEvent', {eventData: {"delaytime":delaytime,"transitionsmode":transitionsmode,"inputrandomness":inputrandomness,"client":client, "randomizer": statusrandom }});
    }

  }

  async function setrandomness() {
    //delaytime = 1;
    //console.log(delaytime);

    const stored = localStorage.prefsrandomness
    const prefsrandomness = writable(stored || inputrandomness)
    localStorage.setItem('prefsrandomness', inputrandomness)

    if (statusrandom) {
      await sendCommand('BroadcastCustomEvent', {eventData: {"delaytime":delaytime,"transitionsmode":transitionsmode,"inputrandomness":inputrandomness,"client":client, "randomizer": statusrandom }});
    }
  }

  async function RandomScene() {

    if (!statusrandom) {

      await sendCommand('BroadcastCustomEvent', {eventData: {"delaytime":delaytime,"transitionsmode":transitionsmode,"inputrandomness":inputrandomness, "client": client, "randomizer": true }});

    } else {
      
      await sendCommand('BroadcastCustomEvent', {eventData: {"delaytime":delaytime,"transitionsmode":transitionsmode,"inputrandomness":inputrandomness, "client": client, "randomizer": false }});
      
    }

  }

  async function StartRandomScene() {

    while (true) {

      if (statusrandom) {
        let randomness = Math.floor(Math.random() * parseFloat(inputrandomness))
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

<div class="button is-info is-light" style="margin: 0 .5rem .5rem 0;width: 3em;">
  <input class="is-info" title="Change Delaytime" bind:value={delaytime} on:change={setdelay} style="line-height: 2.7em;width: 3em;text-align: center;border-top-style: hidden; border-right-style: hidden; border-left-style: hidden; border-bottom-style: hidden; background-color: #eff5fb;">
</div>

<div class="button is-info is-light" style="margin: 0 .5rem .5rem 0;width: 3em;">
  <input class="is-info" title="Change Randomness" bind:value={inputrandomness} on:change={setrandomness} style="line-height: 2.7em;width: 3em;text-align: center;border-top-style: hidden; border-right-style: hidden; border-left-style: hidden; border-bottom-style: hidden; background-color: #eff5fb;">
</div>

<div class="select" style="margin: 0 .5rem .5rem 0;">
  <select bind:value={transitionsmode} title="Change Profile" on:change={setMode}>

    {#if transitionsmode}
      <option value={transitionsmode}>{transitionsmode} (saved)</option>
    {/if}
    
    {#each transitions as transition}
      <option value={transition.transitionName}>{transition.transitionName}</option>      
    {/each}

  </select>
</div>
