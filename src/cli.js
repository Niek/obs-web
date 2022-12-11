const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();
const http = require("http");

//const { obs, sendCommand } = require('./obs.js');

const arg = require('arg');

const args = arg({
	'--host': String,
	'--port': String,
	'--address': String,
	'--password': String,
	'--delaytime': String,
	'--inputrandomness': String,
	'--transitionsmode': String,
	'--startRecording': Boolean,
	'--inputstartStream': Boolean,
	'--startrandom': Boolean,
});

let heartbeat = {}
let statusrandom = true;
let previousrandom; 
let heartbeatInterval
let startup = true;
let client = "cli"

let address = undefined || args['--address'];
let password = undefined || args['--password'];
let delaytime = 2 || args['--delaytime'];
let transitionsmode = "Cut" || args['--transitionsmode']
let inputrandomness = 2 || args['--inputrandomness'];
let inputstartRecording = false || args['--inputstartRecording'];
let inputstartStream = false || args['--inputstartStream'];
let startrandom = false || args['--startrandom'];

let host = false || args['--host'];
let port = 8000 || args['--port'];

let randomizer = {}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function sendCommand (command, params) {
	try {
	  // if (command.indexOf('Set') === 0)
	  //  console.log('Sending command:', command, 'with params:', params)
	  return await obs.call(command, params || {})
	} catch (e) {
	  console.log('Error sending command', command, ' - error is:', e.message)
	  return {}
	}
}
  
obs.on('error', err => {
	console.error('Socket error:', err)
})

obs.on('CustomEvent', data => {
    
    transitionsmode = data['transitionsmode'] 
    delaytime = data['delaytime'];
    inputrandomness = data['inputrandomness'];


    if (data['randomizer'] == true) {
      
      statusrandom = true;
	  StartRandomScene()
	  
    } else {
      
      statusrandom = false;
    
    }

  });


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



async function connect () {

    address = address || 'ws://localhost:4455'
    if (address.indexOf('://') === -1) {
      const secure = location.protocol === 'https:' || address.endsWith(':443')
      address = secure ? 'wss://' : 'ws://' + address
    }
    console.log('Connecting to:', address, '- using password:', password)
    await disconnect()
    try {
      const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
        address,
        password
      )
      console.log(
        `Connected to obs-websocket version ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`
      )
	  
	  if (inputstartStream) await startStream()
	  if (inputstartRecording) await startRecording()
	  if (host) {	
	  
		heartbeatInterval = setInterval(async () => {
			const stats = await sendCommand('GetStats')
			const streaming = await sendCommand('GetStreamStatus')
			const recording = await sendCommand('GetRecordStatus')
			heartbeat = { stats, streaming, recording, randomizer }
			//console.log("heartbeat interval:", heartbeat);
		}, 1000)
	
	} else {
		
		if (startrandom) await sendCommand('BroadcastCustomEvent', {eventData: {"delaytime":delaytime,"transitionsmode":transitionsmode,"inputrandomness":inputrandomness,"client":client, "randomizer": true }});

	}

    } catch (e) {
      console.log(e)
      errorMessage = e.message
    }
  }

async function disconnect () {
	await obs.disconnect()
	clearInterval(heartbeatInterval)
	connected = false
	errorMessage = 'Disconnected'
}

async function startStream() {
	await sendCommand('StartStream')
}

async function startRecording() {
	await sendCommand('StartRecord')
}

async function updateScenes() {
	let data = await sendCommand('GetSceneList');
	currentScene = data.currentScene;
	scenes = data.scenes.filter(i => {
	  return i.name.indexOf('(hidden)') === -1;
	}); // Skip hidden scenes
// 	console.log('Scenes updated');
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

    //await sendCommand('BroadcastCustomEvent', { realm: 'randomscene', eventData: {randomscene: 'active'}});
  
}
  
async function outputjson(){

	const requestListener = function(req, res) {
		res.setHeader("Content-Type", "application/json");
		res.writeHead(200);
		res.end(JSON.stringify(heartbeat, null, 3));
		console.log(JSON.stringify(heartbeat));
	}

	const server = http.createServer(requestListener);
	server.listen(port, host, () => {
		console.log(`Server is running on http://${host}:${port}`);
	});

}	  
if (host) outputjson();
connect()