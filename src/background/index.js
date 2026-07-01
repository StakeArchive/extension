import { openDB } from 'idb'
import { MSG } from '../shared/protocol.js'
import { getLicenseState, heartbeat, clearLicense } from '../account/license.js'
import { isGameAllowed, FREE } from '../account/entitlements.js'

const DB_NAME = 'StakeTrackerDB'
const DB_VERSION = 1
const STORE = 'bets'

const CLEANUP_EVERY = 100
const LOSS_TTL_MS = 24 * 60 * 60 * 1000
const MAX_BYTES = 20 * 1024 * 1024
const RETENTION_CAP = 100000

const HEARTBEAT_MIN_MS = 60 * 1000
const ALERT_MUTE_MS = 6 * 60 * 60 * 1000

let dbPromise = null
let insertsSinceCleanup = 0
let lastHeartbeatAt = 0

let clearedBefore = 0
chrome.storage.local.get('clearedBefore', (r) => {
  void chrome.runtime.lastError
  if (r && r.clearedBefore) clearedBefore = Number(r.clearedBefore) || 0
})

let entitlement = FREE
async function refreshEntitlement() {
  try {
    const state = await getLicenseState()
    entitlement = state.entitlement || FREE
  } catch {
    entitlement = FREE
  }
}
refreshEntitlement()
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.bv_license) {
    refreshEntitlement().then(() => cleanup().catch(() => {}))
  }
})

const allowed = (bet) => isGameAllowed(bet && bet.game, entitlement)

async function runHeartbeat() {
  const now = Date.now()
  if (now - lastHeartbeatAt < HEARTBEAT_MIN_MS) return
  lastHeartbeatAt = now
  const res = await heartbeat()
  if (!res) return
  if (res.valid === false) {
    await deactivateLicense(res.reason)
    return
  }
  if (res.concurrentUse) await raiseConcurrencyAlert(res)
}

async function deactivateLicense(reason) {
  await clearLicense()
  await chrome.storage.local.set({
    bv_alert: { kind: 'revoked', reason: reason || 'revoked', at: Date.now() },
  })
}

async function raiseConcurrencyAlert(info) {
  const { bv_alert_mute } = await chrome.storage.local.get('bv_alert_mute')
  if (bv_alert_mute && Date.now() < bv_alert_mute) return
  await chrome.storage.local.set({
    bv_alert: {
      kind: 'concurrent',
      activeCount: Number(info.activeCount) || 0,
      allowed: Number(info.allowed) || 2,
      at: Date.now(),
    },
  })
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp')
          store.createIndex('multiplier', 'multiplier')
          store.createIndex('game', 'game')
        }
      },
    })
  }
  return dbPromise
}

async function insertBet(bet) {
  if (!bet || !bet.id) return false
  if (!allowed(bet)) return false
  if (clearedBefore && (bet.timestamp || 0) <= clearedBefore) return false

  const db = await getDB()
  await db.put(STORE, bet)

  if (++insertsSinceCleanup >= CLEANUP_EVERY) {
    insertsSinceCleanup = 0
    cleanup().catch(() => {})
  }
  return true
}

const isKeeper = (b) => (b.multiplier ?? 0) > 1 || (b.payout ?? 0) > (b.wager ?? 0)

async function cleanup() {
  const db = await getDB()
  const now = Date.now()

  {
    const tx = db.transaction(STORE, 'readwrite')
    const idx = tx.store.index('timestamp')
    let cursor = await idx.openCursor(IDBKeyRange.upperBound(now - LOSS_TTL_MS))
    while (cursor) {
      const b = cursor.value
      if ((b.multiplier ?? 0) === 0 && !isKeeper(b)) {
        await cursor.delete()
      }
      cursor = await cursor.continue()
    }
    await tx.done
  }

  let overBudget = false
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate()
      overBudget = typeof usage === 'number' && usage > MAX_BYTES
    }
  } catch {
    overBudget = false
  }
  const count = await db.count(STORE)
  if (!overBudget && count <= RETENTION_CAP) return

  const target = Math.floor((overBudget ? 0.8 : 1) * Math.min(count, RETENTION_CAP))
  let toRemove = count - target
  if (toRemove <= 0) return

  const tx = db.transaction(STORE, 'readwrite')
  let cursor = await tx.store.index('timestamp').openCursor()
  while (cursor && toRemove > 0) {
    if (!isKeeper(cursor.value)) {
      await cursor.delete()
      toRemove -= 1
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

async function queryBets(filters = {}) {
  const {
    minWager = 0,
    minMultiplier = 0,
    search = '',
    limit = 100,
    before = null,
    includeZero = false,
  } = filters
  const needle = String(search || '').trim().toLowerCase()

  const db = await getDB()
  const tx = db.transaction(STORE, 'readonly')
  const store = tx.store

  const matches = (b) => {
    if (!allowed(b)) return false
    if (!includeZero && (b.wager ?? 0) <= 0) return false
    if ((b.wager ?? 0) < minWager) return false
    if ((b.multiplier ?? 0) < minMultiplier) return false
    if (before != null && (b.timestamp ?? 0) > before) return false
    if (needle) {
      const hay = `${b.game} ${b.provider || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }

  const results = []

  const useMult = minMultiplier > 0
  const index = useMult ? store.index('multiplier') : store.index('timestamp')
  let range = null
  if (useMult) range = IDBKeyRange.lowerBound(minMultiplier)
  else if (before != null) range = IDBKeyRange.upperBound(before)
  let cursor = await index.openCursor(range, 'prev')

  while (cursor && results.length < limit) {
    const bet = cursor.value
    if (matches(bet)) results.push(bet)
    cursor = await cursor.continue()
  }

  await tx.done
  if (useMult) results.sort((a, b) => b.timestamp - a.timestamp)
  return results
}

async function computeStats(filters = {}) {
  const {
    minWager = 0,
    minMultiplier = 0,
    search = '',
    includeZero = false,
  } = filters
  const needle = String(search || '').trim().toLowerCase()

  const matches = (b) => {
    if (!allowed(b)) return false
    if (!includeZero && (b.wager ?? 0) <= 0) return false
    if ((b.wager ?? 0) < minWager) return false
    if ((b.multiplier ?? 0) < minMultiplier) return false
    if (needle) {
      const hay = `${b.game} ${b.provider || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }

  const db = await getDB()
  const tx = db.transaction(STORE, 'readonly')
  const store = tx.store
  let count = 0
  let maxMultiplier = 0
  const byCurrency = {}
  let cursor = await store.openCursor()
  while (cursor) {
    const b = cursor.value
    if (!matches(b)) {
      cursor = await cursor.continue()
      continue
    }
    count += 1
    if ((b.multiplier || 0) > maxMultiplier) maxMultiplier = b.multiplier
    const cur = (b.currency || '?').toLowerCase()
    const e =
      byCurrency[cur] ||
      (byCurrency[cur] = { currency: cur, count: 0, totalWager: 0, totalPayout: 0, profit: 0 })
    e.count += 1
    e.totalWager += b.wager || 0
    e.totalPayout += b.payout || 0
    e.profit = e.totalPayout - e.totalWager
    cursor = await cursor.continue()
  }
  await tx.done

  const dominant =
    Object.values(byCurrency).sort((a, b) => b.count - a.count)[0]?.currency || null

  return { count, maxMultiplier, byCurrency, dominant }
}

async function clearBets() {
  const db = await getDB()

  const tx = db.transaction(STORE, 'readonly')
  const newest = await tx.store.index('timestamp').openCursor(null, 'prev')
  const ts = newest ? newest.value.timestamp || 0 : 0
  await tx.done
  if (ts) {
    clearedBefore = ts
    chrome.storage.local.set({ clearedBefore: ts })
  }

  await db.clear(STORE)
  insertsSinceCleanup = 0
  return true
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return

  switch (message.type) {
    case MSG.NEW_BET: {
      insertBet(message.bet)
        .then((ok) => {
          if (ok) {
            const tabId = sender?.tab?.id
            if (tabId != null) {
              chrome.tabs
                .sendMessage(tabId, { type: MSG.BET_BROADCAST, bet: message.bet })
                .catch(() => {})
            }
          }
          sendResponse({ ok })
        })
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }

    case MSG.QUERY_BETS: {
      queryBets(message.filters)
        .then((bets) => sendResponse({ ok: true, bets }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }

    case MSG.STATS: {
      computeStats(message.filters)
        .then((stats) => sendResponse({ ok: true, stats }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }

    case MSG.CLEAR_BETS: {
      clearBets()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }))
      return true
    }

    case MSG.HEARTBEAT: {
      runHeartbeat()
        .catch(() => {})
        .finally(() => sendResponse({ ok: true }))
      return true
    }

    default:
      return false
  }
})

getDB()

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id == null) return
  chrome.tabs.sendMessage(tab.id, { type: MSG.SHOW_WIDGET }).catch(() => {})
})
