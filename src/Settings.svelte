<script>
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  export let mysettings = false
  export let myActiveMenuItems = {}

  onMount(async function () {

    console.log(myActiveMenuItems);

  })

  async function setbuttons(key) {

    if (key == 'darkmode'){
      const body = document.querySelector('body');
      if (!myActiveMenuItems['darkmode']) body.className = "dark"
      else body.className = "light"
    }
    
    if (myActiveMenuItems[key]) {
      myActiveMenuItems[key] = false;
    } else {
      myActiveMenuItems[key] = true;
    }

    const stored = localStorage.prefs
    const prefs = writable(stored || JSON.stringify(myActiveMenuItems))
    localStorage.setItem('prefs', JSON.stringify(myActiveMenuItems))
  }

</script>

<div
  class:column={mysettings}
  >
  
  {#if mysettings}
  <h1>Show item</h1>
  {#each Object.entries(myActiveMenuItems) as [key, value]}

    {#if value}
      <input type="checkbox" style="margin: 0 .5rem .5rem 0;" id={key} name={key} checked on:change={setbuttons(key)}>
      <label style="margin: 0 .5rem .5rem 0;" for={key}>{key}</label>
    {:else}
      <input type="checkbox" style="margin: 0 .5rem .5rem 0;" id={key} name={key} on:change={setbuttons(key)}>
      <label style="margin: 0 .5rem .5rem 0;" for={key}>{key}</label>
    {/if}

  {/each}


  {/if}
</div>

<style>
</style>
