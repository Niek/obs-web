<script>
  import { onMount } from 'svelte'
  export let myplanner = false;
  onMount(async function () {

  })

  async function initializeGapi() {
    alert('hi');
  }

</script>


<div class:column={myplanner} style="background-color: #fff;">
  {#if myplanner}   
    <h1 class='label'>Plan stream</h1>
    <label class="label" for="Date">Date:</label>
    <input type="text" class="input" title="Date" value="2022-12-31" />
    <br><br>
    <label class="label" for="Time">Time:</label>
    <input type="text" class="input" title="Time" value="21:00" />
    <br><br>
    <button on:click={initializeGapi}> Submit</button>
  {/if}
</div>
<br>

<style>
  button {
      border: none;
      font-weight: bold;
      height: 3.5em;
      text-align: center;
      width: 8em;
      cursor: pointer;
      background: #3e8ed0 no-repeat center center / cover;
      color: #fff;
      border-radius: 5px;
      padding: 0;
  }
  input{
    width: 8em;
  }
</style>
