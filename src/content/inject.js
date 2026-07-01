;(() => {
  if (window.__betTrackerInstalled) return
  window.__betTrackerInstalled = true

  const SOURCE = 'bet-tracker-inject'
  const DEBUG = false
  const log = (...a) => DEBUG && console.debug('[bet-tracker]', ...a)

  let framesSeen = 0
  let betsFound = 0
  let myUserId = null
  let authToken = null

  function rememberToken(headers) {
    try {
      if (!headers) return
      let t
      if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        t = headers.get('x-access-token')
      } else if (Array.isArray(headers)) {
        const f = headers.find((p) => String(p[0]).toLowerCase() === 'x-access-token')
        t = f && f[1]
      } else if (typeof headers === 'object') {
        for (const k in headers) {
          if (String(k).toLowerCase() === 'x-access-token') t = headers[k]
        }
      }
      if (t) authToken = String(t)
    } catch {}
  }

  let ratesCache = {}

  function extractRates(parsed) {
    if (!parsed || typeof parsed !== 'object') return null
    const info = (parsed.data && parsed.data.info) || parsed.info
    const currencies = info && info.currencies
    if (!Array.isArray(currencies)) return null
    const rates = {}
    for (const c of currencies) {
      if (c && typeof c.name === 'string') {
        const usd = num(c.usd != null ? c.usd : c.value)
        if (usd !== undefined && usd > 0) rates[c.name.toLowerCase()] = usd
      }
    }
    return Object.keys(rates).length ? rates : null
  }

  function pushRates(rates) {
    if (!rates) return
    let changed = false
    for (const k in rates) {
      if (ratesCache[k] !== rates[k]) {
        ratesCache[k] = rates[k]
        changed = true
      }
    }
    if (changed) window.postMessage({ source: SOURCE, rates: ratesCache }, '*')
  }

  function fetchRates() {
    const headers = { 'content-type': 'application/json' }
    if (authToken) headers['x-access-token'] = authToken
    const f = typeof nativeFetch === 'function' ? nativeFetch : window.fetch
    return f
      .call(window, location.origin + '/_api/graphql', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          operationName: 'CurrencyConversionRate',
          query:
            'query CurrencyConversionRate { info { currencies { name usd: value(fiatCurrency: usd) } } }',
          variables: {},
        }),
      })
      .then((r) => r.json())
      .then((j) => pushRates(extractRates(j)))
      .catch(() => {})
  }

  function resolveBet(idOrIid) {
    if (!idOrIid) return Promise.resolve(null)
    const isIid = String(idOrIid).includes(':')
    const headers = { 'content-type': 'application/json' }
    if (authToken) headers['x-access-token'] = authToken
    const f = typeof nativeFetch === 'function' ? nativeFetch : window.fetch
    return f
      .call(window, location.origin + '/_api/graphql', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          operationName: 'BetLookup',
          query:
            'query BetLookup($betId: String, $iid: String) { bet(betId: $betId, iid: $iid) { iid game { slug } } }',
          variables: isIid ? { iid: idOrIid } : { betId: idOrIid },
        }),
      })
      .then((r) => r.json())
      .then((j) => {
        const b = j && j.data && j.data.bet
        if (!b) return null
        return { iid: b.iid || null, slug: (b.game && b.game.slug) || null }
      })
      .catch(() => null)
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return
    const d = e.data
    if (!d) return
    if (d.source === 'bet-tracker-config' && d.myUserId) {
      myUserId = String(d.myUserId)
      return
    }
    if (d.source === 'bet-tracker-widget' && d.type === 'resolveBet' && d.reqId) {
      resolveBet(d.betId).then((result) => {
        window.postMessage(
          { source: SOURCE, type: 'betResult', reqId: d.reqId, result },
          '*',
        )
      })
    }
    if (d.source === 'bet-tracker-widget' && d.type === 'navigate' && d.url) {
      try {
        window.history.pushState({}, '', d.url)
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
      } catch (_) {
        window.location.href = d.url
      }
    }
  })

  const num = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v
    return typeof n === 'number' && isFinite(n) ? n : undefined
  }

  function gameNameFrom(o) {
    if (typeof o.game === 'string' && o.game) return o.game
    return (
      o.gameName ??
      o.game?.name ??
      o.game?.title ??
      o.game?.slug ??
      o.gameTitle ??
      o.slug ??
      undefined
    )
  }

  function gameNameFromState(o) {
    for (const key in o) {
      const m = /^state([A-Z][A-Za-z0-9]+)$/.exec(key)
      if (m) return m[1].toLowerCase()
    }
    return undefined
  }

  function asBet(o, inh) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null
    if (o.active === true) return null

    const uuid = o.id ?? o.betId
    const iid = o.iid ?? inh.iid
    const canonical = uuid ?? iid
    const display = iid ?? uuid
    const amount = num(o.amount ?? o.wager ?? o.value)
    let payout = num(o.payout ?? o.payoutAmount)
    const multiplier = num(o.payoutMultiplier ?? o.multiplier)

    if (!canonical) return null
    if (amount === undefined || multiplier === undefined) return null
    if (payout === undefined) payout = amount * multiplier

    const gameName = gameNameFrom(o) || gameNameFromState(o) || inh.game || 'unknown'

    const provider =
      o.provider ??
      o.game?.provider ??
      o.providerName ??
      inh.provider ??
      (o.type === 'casino' || typeof o.game === 'string' || inh.game
        ? 'stake-originals'
        : undefined)

    const tsRaw = o.updatedAt ?? o.createdAt ?? o.timestamp
    let timestamp = num(tsRaw)
    if (timestamp !== undefined && timestamp < 1e12) timestamp *= 1000
    if (timestamp === undefined && typeof tsRaw === 'string') {
      const parsed = Date.parse(tsRaw)
      if (!isNaN(parsed)) timestamp = parsed
    }
    if (timestamp === undefined) timestamp = Date.now()

    const userId = o.userId ?? o.user?.id ?? inh.userId

    return {
      id: String(canonical),
      displayId: String(display),
      userId: userId ? String(userId) : undefined,
      wager: amount,
      payout,
      multiplier,
      game: String(gameName),
      provider: provider ? String(provider) : 'unknown',
      currency: o.currency ? String(o.currency) : inh.currency,
      nonce: num(o.nonce),
      timestamp,
      capturedAt: Date.now(),
    }
  }

  function harvest(node, out, inh = {}, depth = 0) {
    if (depth > 8 || node === null || typeof node !== 'object') return

    const next = Array.isArray(node)
      ? inh
      : {
          game: gameNameFrom(node) || gameNameFromState(node) || inh.game,
          iid: node.iid ?? inh.iid,
          userId: node.userId ?? node.user?.id ?? inh.userId,
          currency: node.currency ?? inh.currency,
          provider: node.provider ?? node.providerName ?? inh.provider,
        }

    const bet = asBet(node, next)
    if (bet) out.push(bet)

    if (Array.isArray(node)) {
      for (const item of node) harvest(item, out, inh, depth + 1)
    } else {
      for (const key in node) {
        const v = node[key]
        if (v && typeof v === 'object') harvest(v, out, next, depth + 1)
      }
    }
  }

  const MINE_URL = /\/bet(s)?(\b|\/|\?|$)/i
  function isMineSource(ctx) {
    if (!ctx || ctx.transport === 'ws') return false
    if (!/post/i.test(ctx.method || '')) return false
    const url = ctx.url || ''
    if (/graphql/i.test(url)) return false
    return MINE_URL.test(url)
  }

  function forward(bet, via) {
    betsFound += 1
    log(`my bet via ${via}:`, bet.game, bet.multiplier + 'x', bet.id)
    window.postMessage({ source: SOURCE, bet }, '*')
  }

  function handleRaw(data, ctx) {
    if (typeof data !== 'string') return
    if (data.length < 20 || data.indexOf('{') === -1) return
    framesSeen += 1

    let parsed
    try {
      parsed = JSON.parse(data)
    } catch {
      return
    }
    pushRates(extractRates(parsed))
    const bets = []
    harvest(parsed, bets)
    if (!bets.length) return

    const mine = isMineSource(ctx)
    const seen = new Set()
    for (const bet of bets) {
      if (seen.has(bet.id)) continue
      seen.add(bet.id)

      if (mine) {
        if (bet.userId && bet.userId !== myUserId) {
          myUserId = bet.userId
          window.postMessage({ source: SOURCE, identify: myUserId }, '*')
        }
        forward(bet, ctx.transport)
      } else if (myUserId && bet.userId && bet.userId === myUserId) {
        forward(bet, ctx.transport + '/feed')
      }
    }
  }

  const NativeWebSocket = window.WebSocket
  if (NativeWebSocket && !NativeWebSocket.__betTrackerWrapped) {
    function WrappedWebSocket(url, protocols) {
      const ws =
        protocols !== undefined
          ? new NativeWebSocket(url, protocols)
          : new NativeWebSocket(url)
      try {
        ws.addEventListener(
          'message',
          (event) => {
            try {
              handleRaw(event.data, { transport: 'ws' })
            } catch {}
          },
          { capture: true, passive: true },
        )
      } catch {}
      return ws
    }
    WrappedWebSocket.prototype = NativeWebSocket.prototype
    WrappedWebSocket.CONNECTING = NativeWebSocket.CONNECTING
    WrappedWebSocket.OPEN = NativeWebSocket.OPEN
    WrappedWebSocket.CLOSING = NativeWebSocket.CLOSING
    WrappedWebSocket.CLOSED = NativeWebSocket.CLOSED
    WrappedWebSocket.__betTrackerWrapped = true
    try {
      Object.defineProperty(window, 'WebSocket', {
        configurable: true,
        writable: true,
        value: WrappedWebSocket,
      })
    } catch {
      window.WebSocket = WrappedWebSocket
    }
  }

  const nativeFetch = window.fetch
  if (typeof nativeFetch === 'function' && !nativeFetch.__betTrackerWrapped) {
    const wrapped = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || ''
      const method = (init && init.method) || (input && input.method) || 'GET'
      if (/\/_api\//.test(url)) {
        rememberToken(init && init.headers)
        if (input && input.headers) rememberToken(input.headers)
      }
      return nativeFetch.apply(this, arguments).then((res) => {
        try {
          const ct = (res.headers && res.headers.get('content-type')) || ''
          if (ct.includes('json') || ct.includes('text')) {
            res
              .clone()
              .text()
              .then((t) => handleRaw(t, { transport: 'fetch', url, method }))
              .catch(() => {})
          }
        } catch {}
        return res
      })
    }
    wrapped.__betTrackerWrapped = true
    window.fetch = wrapped
  }

  const XHR = window.XMLHttpRequest
  if (XHR && !XHR.prototype.__betTrackerWrapped) {
    const origOpen = XHR.prototype.open
    XHR.prototype.open = function (method, url) {
      this.__bt = { method, url }
      return origOpen.apply(this, arguments)
    }
    const origSetHeader = XHR.prototype.setRequestHeader
    XHR.prototype.setRequestHeader = function (name, value) {
      try {
        if (String(name).toLowerCase() === 'x-access-token' && value) {
          authToken = String(value)
        }
      } catch {}
      return origSetHeader.apply(this, arguments)
    }
    const origSend = XHR.prototype.send
    XHR.prototype.send = function (...args) {
      try {
        this.addEventListener('load', function () {
          try {
            const ctx = {
              transport: 'xhr',
              url: (this.__bt && this.__bt.url) || this.responseURL || '',
              method: (this.__bt && this.__bt.method) || 'GET',
            }
            const rt = this.responseType
            if (rt === '' || rt === 'text') handleRaw(this.responseText, ctx)
            else if (rt === 'json' && this.response)
              handleRaw(JSON.stringify(this.response), ctx)
          } catch {}
        })
      } catch {}
      return origSend.apply(this, args)
    }
    XHR.prototype.__betTrackerWrapped = true
  }

  if (window.top === window) {
    setTimeout(fetchRates, 2500)
    setInterval(fetchRates, 60000)
  }

  window.__betTrackerStats = () => ({ framesSeen, betsFound })
  log('installed (ws + fetch + xhr). Run __betTrackerStats() to inspect.')
})()
