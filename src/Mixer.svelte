<script>
  import { onMount, onDestroy } from 'svelte';
  import { obs, sendCommand } from './obs.js';


  onMount(async () => {
    sendCommand('GetInputList').then((data) => {
      // console.log('Mixer GetInputList', data);
      for (let i = 0; i < data.inputs.length; i++) {
        if (data.inputs[i].inputKind === 'Mic/Aux') {
          data.inputs[i].inputName = 'Mic';
        }
        sendCommand('GetInputVolume', {
          inputName: data.inputs[i].inputName,
        }).then((vol) => {
          // console.log('Mixer GetInputVolume', vol);
          if ( "inputVolumeDb" in vol) {;
            inputs[data.inputs[i].inputName] = {
              ...data.inputs[i],
              ...vol,
            };
          }
        });
      }
    });
  });

  onDestroy(() => {});

  let inputs = {};

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('Mixer StudioModeStateChanged', data.studioModeEnabled);
  });

  obs.on('CurrentPreviewSceneChanged', async (data) => {
    console.log('Mixer CurrentPreviewSceneChanged', data.sceneName);
  });

  obs.on('CurrentProgramSceneChanged', async (data) => {
    console.log('Mixer CurrentProgramSceneChanged', data.sceneName);
  });

  obs.on('InputVolumeChanged', async (data) => {
    // console.log('Mixer InputVolumeChanged', data)
    if (inputs[data.inputName]) {
      inputs[data.inputName] = { ...inputs[data.inputName], ...data };
    }
  });

  // obs.on('InputVolumeMeters', async (data) => {
  //   // console.log('Mixer InputVolumeChanged', data.inputs)
  //   inputMeter = data.inputs
  //   if (inputMeter && inputMeter.length > 0) {
  //     tempval = Math.round(inputMeter[0].inputLevelsMul[0][2] * 100)
  //   }
  // })

  // obs.on('SceneNameChanged', async (data) => {
  //   if (data.oldSceneName === programScene) programScene = data.sceneName
  //   if (data.oldSceneName === previewScene) previewScene = data.sceneName
  // })

  function updateVolume(e) {
    // console.log('updateVolume', e.target.name, e.target.value)
    sendCommand('SetInputVolume', {
      inputName: e.target.name,
      inputVolumeDb: parseFloat(e.target.value),
    });
  }

  function updateVolumeDelta(inputName, db) {
    const newVolume = db === 0 ? 0 : inputs[inputName].inputVolumeDb + db;
    sendCommand('SetInputVolume', {
      inputName: inputName,
      inputVolumeDb: parseFloat(newVolume),
    });
  }
</script>

<ol>
  {#if inputs && Object.keys(inputs).length > 0}
    {#each Object.keys(inputs) as iname}
      <li class="box is-marginless">
        <div class="is-relative">
          <span class="tag is-white is-small mixer-label"
            >{inputs[iname].inputName}</span
          >
          <input
            orient="vertical"
            class="slider mixer-slider"
            step="0.1"
            min="-60"
            max="12"
            value={inputs[iname].inputVolumeDb}
            type="range"
            on:input={updateVolume}
            name={inputs[iname].inputName}
          />
          <div class="buttons are-small mixer-buttons">
            <button
              class="button is-light"
              on:click={() => updateVolumeDelta(inputs[iname].inputName, 1)}
              >+1</button
            >
            <button
              class="button is-light"
              on:click={() => updateVolumeDelta(inputs[iname].inputName, 0)}
              >=0</button
            >
            <button
              class="button is-light"
              on:click={() => updateVolumeDelta(inputs[iname].inputName, -1)}
              >-1</button
            >
          </div>
        </div>
        <span
          class="tag is-info is-small is-light is-marginless is-centered mixer-value"
          >{typeof inputs[iname].inputVolumeDb === 'number'
            ? inputs[iname].inputVolumeDb.toFixed(1)
            : inputs[iname].inputVolumeDb} dB
        </span>
      </li>
    {/each}
  {/if}
</ol>

<style>
  ol {
    list-style: None;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    row-gap: 0.5rem;
  }
  .mixer-slider {
    width: 4rem;
    height: 10rem;
  }
  /* patch bulma-slider bug on chrome */
  input[type='range'].slider[orient='vertical']::-webkit-slider-thumb {
    position: relative;
    left: 0.25rem;
  }
  .mixer-value {
    width: 4rem;
  }
  .mixer-buttons {
    position: absolute;
    top: 0;
    right: 0rem;
    width: 1rem;
  }
  .mixer-label {
    position: absolute;
    transform-origin: 0 0;
    left: 0.5rem;
    transform: rotate(90deg);
  }
</style>
