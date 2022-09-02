import OBSWebSocket from 'obs-websocket-js'

export const obs = new OBSWebSocket()

export async function sendCommand (command, params) {
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
