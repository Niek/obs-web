<script>
  export let name
  export let buttonStyle = 'text'
  export let icon = '#ffffff'
  export let isProgram = false
  export let isPreview = false
  export let img = ''

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  $: style = icon.startsWith('#')
    ? `background-color: ${icon};`
    : `background-image: url(${icon});`
</script>

<button
  class:title={buttonStyle === 'text'}
  class:program={isProgram}
  class:preview={isPreview}
  class:with-icon={buttonStyle === 'icon'}
  on:click={() => dispatch('click')}
  style={buttonStyle === 'icon' ? style : ''}
  title={name}
  >
  {#if img}<img src={img} alt={name} class="thumbnail" />{/if}
  {#if buttonStyle !== 'icon'}{name}{/if}
</button>

<style>
  button {
    border: none;
    height: 4rem;
    text-align: center;
    width: 100%;
    cursor: pointer;
    background: #3e8ed0 no-repeat center center / cover;
    color: #fff;
    border-radius: 5px;
  }
  button.preview {
    background-color: #00d1b2;
  }
  button.program {
    background-color: #f14668;
  }
  button:not(.title) {
    padding: 0;
    width: 192px;
    height: 126px;
  }
  button.with-icon {
    height: 64px;
    width: 64px;
    box-shadow: 2px 2px 5px gray;
    margin: .5em;
    border-radius: 5px;
    cursor: pointer;
    background: white no-repeat center center / cover;
    position: relative;
  }
  button.with-icon.program::before {
    content: " ";
    position: absolute;
    top: -5px;
    right: -5px;
    background: red;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 1px 1px 5px gray;
  }
  .thumbnail {
    display: block;
    max-width: 100%;
    max-height: calc(100% - 1rem);
    margin: 0 auto;
  }
</style>
