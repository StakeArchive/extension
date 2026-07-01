import { MSG } from '../../shared/protocol.js'

function send(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (res) => {
        const err = chrome.runtime.lastError
        if (err) return reject(new Error(err.message))
        resolve(res)
      })
    } catch (e) {
      reject(e)
    }
  })
}

export async function queryBets(filters) {
  const res = await send({ type: MSG.QUERY_BETS, filters })
  return res?.ok ? res.bets : []
}

export async function fetchStats(filters) {
  const res = await send({ type: MSG.STATS, filters })
  return res?.ok ? res.stats : null
}

export async function clearBets() {
  const res = await send({ type: MSG.CLEAR_BETS })
  return !!res?.ok
}
