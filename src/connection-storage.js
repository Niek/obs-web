/* eslint-env browser */

const CONNECTION_COOKIE_NAME = 'obsConnection'
const CONNECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function encodeConnection (data) {
  try {
    const json = JSON.stringify(data)
    // Note: this is simple base64 encoding, not strong encryption.
    // It prevents casual snooping of the cookie contents but does
    // not protect against a determined attacker with access to this origin.
    return btoa(json)
  } catch (e) {
    console.warn('Failed to encode connection cookie', e)
    return ''
  }
}

function decodeConnection (value) {
  if (!value) return null
  try {
    const json = atob(value)
    return JSON.parse(json)
  } catch (e) {
    console.warn('Failed to decode connection cookie', e)
    return null
  }
}

export function setConnectionCookie (connection) {
  if (!connection) {
    document.cookie = `${CONNECTION_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax`
    return
  }
  const encoded = encodeConnection(connection)
  if (!encoded) return
  let cookie = `${CONNECTION_COOKIE_NAME}=${encoded}; Max-Age=${CONNECTION_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
  if (location.protocol === 'https:') {
    cookie += '; Secure'
  }
  document.cookie = cookie
}

export function getConnectionCookie () {
  const cookies = document.cookie ? document.cookie.split('; ') : []
  const found = cookies.find((c) => c.startsWith(`${CONNECTION_COOKIE_NAME}=`))
  if (!found) return null
  const value = found.split('=').slice(1).join('=')
  return decodeConnection(value)
}


