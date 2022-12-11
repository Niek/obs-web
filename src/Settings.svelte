<script>
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  export let mysettings = false
  export let myActiveMenuItems = {}

  let myActiveMenuItemsOutput = {};

  onMount(async function () {

    console.log("myActiveMenuItems settings:",myActiveMenuItems);
    myActiveMenuItemsOutput = await myActiveMenuItemsOutputFunc(myActiveMenuItems);

  })

  async function myActiveMenuItemsOutputFunc(object1) {
    let rows = []
    let row = []
    let id = 0
    // for (let i = 0; i < 1; i++) {
    //   let row = []
    //   for (let item in Object.entries(object1)) { row.push((object1[item])) }
    //   rows.push(row)
    //   console.log(row)
    // }
    let c = 0;
    let y = 0;
    let tot = Object.entries(object1).length;

    console.log("len object1:",Object.entries(object1).length)
    for (const [key, value] of Object.entries(object1)) {
      c += 1;
      y += 1;
      
      // let newobj = {"key":"key","value":key}
      // row.push(newobj);

      let newobj = {"key":key,"value":value}
      row.push(newobj);

      if (c == 5 && tot >= y-5) {
        rows.push(row)
        row = []
        c = 0;
      }
    }

    //Add last row...
    if (row.length >= 1) rows.push(row)

    //output.push(row)

    console.log(rows)

    return rows

  }

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

    myActiveMenuItemsOutput = await myActiveMenuItemsOutputFunc(myActiveMenuItems);
  }

</script>

<div class:column={mysettings} style="background-color: hsl(0deg, 0%, 96%);">
  
  {#if mysettings}
  
  <h1 class="label">Show item menu</h1>
  <div class="divTable">
    <div class="divTableBody">
      
      {#each myActiveMenuItemsOutput as rows}
        <div class="divTableRow">
            {#each Object.entries(rows) as [key]}
                {#if rows[key]['value']}
                <div class="divTableCell">
                  <input type="checkbox" style="margin: 0 .5rem .5rem 0;" id={rows[key]['key']} name={rows[key]['key']} checked on:change={setbuttons(rows[key]['key'])}>        
                </div>
                {:else}
                <div class="divTableCell">
                  <input type="checkbox" style="margin: 0 .5rem .5rem 0;" id={rows[key]['key']} name={rows[key]['key']} on:change={setbuttons(rows[key]['key'])}>   
                </div>
                {/if}
                <div class="divTableCell">
                  <label style="margin: 0 .5rem .5rem 0;" for={rows[key]['key']}> {rows[key]['key']}</label>
                </div>
            {/each}
          </div>
      {/each}

  </div>
</div>
{/if}
</div>
<br>

<style>
.divTable{
	display: table;
	width: 100%;
}
.divTableRow {
	display: table-row;
}
.divTableCell {
	/* border: 1px solid #999999; */
	display: table-cell;
	padding-left: 10px;
}
.divTableBody {
	display: table-row-group;
}
</style>
