import { MSG, PAGE_MESSAGE_SOURCE } from '../shared/protocol.js'

const USER_KEY = 'myUserId'

try {
  chrome.storage.local.get(USER_KEY, (res) => {
    void chrome.runtime.lastError
    const id = res && res[USER_KEY]
    if (id) {
      window.postMessage({ source: 'bet-tracker-config', myUserId: id }, '*')
    }
  })
} catch {}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data
  if (!data || data.source !== PAGE_MESSAGE_SOURCE) return

  if (data.identify) {
    try {
      chrome.storage.local.set({ [USER_KEY]: String(data.identify) })
    } catch {}
    return
  }

  if (data.rates) {
    try {
      chrome.storage.local.set({ sa_rates: { rates: data.rates, at: Date.now() } })
    } catch {}
    return
  }

  if (!data.bet) return

  try {
    chrome.runtime.sendMessage({ type: MSG.NEW_BET, bet: data.bet }, () => {
      void chrome.runtime.lastError
    })
  } catch {}
})

const HEARTBEAT_MS = 90 * 1000
function sendHeartbeat() {
  if (document.visibilityState !== 'visible') return
  try {
    chrome.runtime.sendMessage({ type: MSG.HEARTBEAT }, () => {
      void chrome.runtime.lastError
    })
  } catch {}
}
if (window.top === window) {
  sendHeartbeat()
  setInterval(sendHeartbeat, HEARTBEAT_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sendHeartbeat()
  })
}
