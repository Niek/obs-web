<script>
  export let isStudioMode;
  export let transitionScene;
</script>

<div class="columns is-centered is-vcentered has-text-centered">
  {#if isStudioMode}
    <div class="column">
      <img id="preview" class="is-hidden has-background-dark" alt="Preview" />
    </div>
    <div class="column is-narrow">
      <button on:click={transitionScene} class="button is-fullwidth is-info">Transition</button>
    </div>
  {/if}
  <div class="column">
    <img id="program" alt="Program" class="is-hidden"/>
  </div>
</div>

