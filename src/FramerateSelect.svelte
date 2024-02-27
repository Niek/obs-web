<script>
  import { onMount } from 'svelte';
  import { sendCommand } from './obs.js';

  let currentFramerate = '';
  let framerateData = [
    { fps: '23.976', fpsNumerator: 24000, fpsDenominator: 1001 }, // 24 FPS (Film Standard, 23.976 for NTSC compatibility)
    { fps: '25', fpsNumerator: 25, fpsDenominator: 1 }, // 25 FPS (PAL/SECAM Standard)
    { fps: '29.97', fpsNumerator: 30000, fpsDenominator: 1001 }, // 29.97 FPS (NTSC Standard)
    { fps: '30', fpsNumerator: 30, fpsDenominator: 1 }, // 30 FPS
    { fps: '50', fpsNumerator: 50, fpsDenominator: 1 }, // 50 FPS (High Frame Rate PAL/SECAM)
    { fps: '59.94', fpsNumerator: 60000, fpsDenominator: 1001 }, // 59.94 FPS (High Frame Rate NTSC)
    { fps: '60', fpsNumerator: 60, fpsDenominator: 1 }, // 60 FPS
    { fps: '120', fpsNumerator: 120, fpsDenominator: 1 }, // 120 FPS (High Frame Rate for Gaming and VR)
  ];

  onMount(async function () {
    const data = await sendCommand('GetVideoSettings');
    const matchingFps = framerateData.find(
      (f) => f.fpsNumerator === data.fpsNumerator,
    );
    currentFramerate = matchingFps.fps;
  });

  async function setFramerate(event) {
    const selectedFps = framerateData.find((f) => f.fps === event.target.value);
    if (selectedFps) {
      await sendCommand('SetVideoSettings', {
        fpsNumerator: selectedFps.fpsNumerator,
        fpsDenominator: selectedFps.fpsDenominator,
      });
      currentFramerate = selectedFps.fps;
    }
  }
</script>

<div class="select" style="margin: 0 .5rem .5rem 0;">
  <select
    bind:value={currentFramerate}
    title="Change FPS"
    on:change={setFramerate}
  >
    {#each framerateData as framerate}
      <option value={framerate.fps}> {framerate.fps} FPS </option>
    {/each}
  </select>
</div>
