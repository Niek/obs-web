import OBSWebSocket from 'obs-websocket-js'

export const obs = new OBSWebSocket()
export const DEFAULT_OBS_ADDRESS = 'ws://localhost:4455'

export function parseObsConnectionDetails (
  inputAddress,
  inputPassword,
  defaultSecure
) {
  let address = (inputAddress || DEFAULT_OBS_ADDRESS).trim()
  let password = inputPassword

  if (/^obswss?:\/\//i.test(address)) {
    const url = new URL(address)
    const protocol = url.protocol === 'obswss:' ? 'wss:' : 'ws:'
    address = `${protocol}//${url.host}`
    password = url.pathname ? decodeURIComponent(url.pathname.slice(1)) : password
  }

  if (address.indexOf('://') === -1) {
    const secure = defaultSecure || address.endsWith(':443')
    address = (secure ? 'wss://' : 'ws://') + address
  }

  return { address, password }
}

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
