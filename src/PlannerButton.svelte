<script>
  import { onMount } from 'svelte'
  import {
  mdiCalendar,
    mdiShuffle
    } from '../node_modules/@mdi/js/mdi'
  import Icon from '../node_modules/mdi-svelte'

  export let myplanner = false;

  onMount(async function () {

  })

</script>

<button class:is-light={!myplanner} class="button is-link" title="Plan" on:click={() => (myplanner = !myplanner)} >
  <span class="icon"> <Icon path={myplanner ? mdiCalendar : mdiCalendar} /> </span>
</button>

<style>
</style>
