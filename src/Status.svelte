<script>
  import { onMount, onDestroy } from 'svelte';
  import { obs, sendCommand } from './obs.js';

  export let heartbeat = {};

  $: {
    calculateStreamingMbps(heartbeat);
  }

  // TODO: Get this from the actual system
  const totalSystemMemory = 16 * 1000;

  let recentOutputBytes = [];
  let streamingMbps = 0;

  function calculateStreamingMbps(heartbeat){
    if (heartbeat && heartbeat.streaming && heartbeat.streaming.outputActive) {
      recentOutputBytes.push(heartbeat.streaming.outputBytes);
      if (recentOutputBytes.length > 5) {
        recentOutputBytes.shift();
      }
      streamingMbps = (recentOutputBytes[recentOutputBytes.length - 1] - recentOutputBytes[0]) * 8 / 1000 / 1000 / (recentOutputBytes.length - 1);
    }
  }

  onMount(async () => {});

  onDestroy(() => {});
</script>

<div class="field is-grouped is-grouped-multiline m-1">
  {#if heartbeat && heartbeat.stats}
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">CPU</span>
      <span class="tag {heartbeat.stats.cpuUsage > 50 ? 'is-danger' : 'is-info'}">
        {Math.round(heartbeat.stats.cpuUsage)}%
      </span>
    </div>
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">Disk</span>
      <span class="tag {heartbeat.stats.availableDiskSpace < 50*1000 ? 'is-danger' : 'is-info'}">
        {Math.round(heartbeat.stats.availableDiskSpace / 1000)}GB
      </span>
    </div>
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">MEM</span>
      <span class="tag {(heartbeat.stats.memoryUsage * 100 / totalSystemMemory > 70) ? 'is-danger' : 'is-info'}">
        {Math.round(heartbeat.stats.memoryUsage * 100 / totalSystemMemory)}%
      </span>
    </div>
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">RenderDF</span>
      <span class="tag {heartbeat.stats.renderSkippedFrames > 0 ? 'is-danger' : 'is-info'}">
        {heartbeat.stats.renderSkippedFrames}
      </span>
    </div>
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">OutputDF</span>
      <span class="tag {heartbeat.stats.outputSkippedFrames > 0 ? 'is-danger' : 'is-info'}">
        {heartbeat.stats.outputSkippedFrames}
      </span>
    </div>
  {/if}
  {#if heartbeat && heartbeat.streaming && heartbeat.streaming.outputActive}
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">StreamingDF</span>
      <span class="tag {heartbeat.streaming.outputSkippedFrames > 0 ? 'is-danger' : 'is-success'}">
        {heartbeat.streaming.outputSkippedFrames}
      </span>
    </div>
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">StreamingBR</span>
      <span class="tag {streamingMbps < 1.0 ? 'is-danger' : 'is-success'}">
        {streamingMbps.toFixed(1)}Mbps
      </span>
    </div>
  {/if}
  {#if heartbeat && heartbeat.streaming && heartbeat.recording.outputActive}
    <div class="tags has-addons mx-1 my-0">
      <span class="tag is-dark">RecordingSize</span>
      <span class="tag is-success">
        {(heartbeat.recording.outputBytes / 1000000000).toFixed(2)}GB
      </span>
    </div>
  {/if}
</div>
