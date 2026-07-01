import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toUsd, fmtUsd } from '../../shared/usd.js'

const FIAT = new Set([
  'usdt', 'usdc', 'dai', 'busd', 'usd', 'eur', 'tusd', 'usdp', 'usdd', 'gusd', 'pyusd',
])

function fmtCompact(n, d = 2) {
  const num = Number(n ?? 0)
  const abs = Math.abs(num)
  const unit = (v, s) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + s
  if (abs >= 1e9) return unit(num / 1e9, 'b')
  if (abs >= 1e6) return unit(num / 1e6, 'm')
  if (abs >= 1e3) return unit(num / 1e3, 'k')
  return num.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}

function fmtWager(n, currency) {
  const num = Number(n || 0)
  if (Math.abs(num) >= 1e3) return fmtCompact(num)
  const c = (currency || '').toLowerCase()
  const fiat = FIAT.has(c)
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: fiat ? 2 : 8,
  })
}

const fmtMult = (n) => `${fmtCompact(n ?? 0)}\u00d7`

function multStyle(m) {
  if (m > 100) return { cls: 'text-accent font-bold', style: undefined }
  if (m > 1) return { cls: 'text-accent', style: undefined }
  return { cls: 'text-muted', style: undefined }
}

let reqCounter = 0
function resolveBetViaPage(betId, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const reqId = `bt-${Date.now()}-${(reqCounter += 1)}`
    let done = false
    const onMsg = (e) => {
      if (e.source !== window) return
      const d = e.data
      if (
        d &&
        d.source === 'bet-tracker-inject' &&
        d.type === 'betResult' &&
        d.reqId === reqId
      ) {
        done = true
        window.removeEventListener('message', onMsg)
        resolve(d.result || null)
      }
    }
    window.addEventListener('message', onMsg)
    window.postMessage(
      { source: 'bet-tracker-widget', type: 'resolveBet', reqId, betId },
      '*',
    )
    setTimeout(() => {
      if (!done) {
        window.removeEventListener('message', onMsg)
        resolve(null)
      }
    }, timeoutMs)
  })
}

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')

const buildShareUrl = (slug, iid) =>
  `${location.origin}/casino/games/${slug}?iid=${encodeURIComponent(iid)}&modal=bet`

const formatGameName = (s) =>
  String(s || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 animate-spin" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M10 3a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ClipboardIcon({ copied }) {
  if (copied) {
    return (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path
          d="M4 10.5l3.5 3.5L16 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <rect x="6.5" y="6.5" width="9" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 13.5V4.8c0-.7.6-1.3 1.3-1.3H12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LinkIcon({ copied }) {
  if (copied) {
    return (
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path
          d="M4 10.5l3.5 3.5L16 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M8.2 11.8a2.6 2.6 0 0 0 3.9.3l2.3-2.3a2.6 2.6 0 1 0-3.7-3.7l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.8 8.2a2.6 2.6 0 0 0-3.9-.3L5.6 10.2a2.6 2.6 0 1 0 3.7 3.7l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function BetRow({ bet, index = 0, rates }) {
  const [resolved, setResolved] = useState(null)
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)
  const [toast, setToast] = useState(null)
  const [hover, setHover] = useState(null)
  const mult = multStyle(bet.multiplier ?? 0)
  const tint = index % 2 === 0 ? 'bg-base-700' : 'bg-base-750'

  const wagerUsd = toUsd(bet.wager, bet.currency, rates)
  const showUsd = wagerUsd !== null

  const known = bet.displayId || bet.id
  const hasHouseId = (id) => typeof id === 'string' && id.includes(':')

  const ensure = async () => {
    if (resolved) return resolved
    const r = await resolveBetViaPage(bet.id)
    if (r && (r.iid || r.slug)) {
      setResolved(r)
      return r
    }
    return null
  }

  const prefetch = () => {
    if (resolved || busy) return
    setBusy('prefetch')
    resolveBetViaPage(bet.id).then((r) => {
      if (r && (r.iid || r.slug)) setResolved(r)
      setBusy(null)
    })
  }

  const flash = (label, which) => {
    setToast(label)
    setDone(which)
    setTimeout(() => {
      setToast(null)
      setDone(null)
    }, 900)
  }

  const copyId = async (e) => {
    e?.stopPropagation?.()
    let iid = resolved?.iid || (hasHouseId(known) ? known : null)
    if (!iid) {
      setBusy('id')
      const r = await ensure()
      setBusy(null)
      iid = r?.iid
    }
    await writeClipboard(iid || known)
    flash('COPIED', 'id')
  }

  const buildUrl = async (which) => {
    let iid = resolved?.iid || (hasHouseId(known) ? known : null)
    let slug = resolved?.slug
    if (!iid || !slug) {
      setBusy(which)
      const r = await ensure()
      setBusy(null)
      iid = iid || r?.iid
      slug = slug || r?.slug
    }
    return buildShareUrl(slug || slugify(bet.game), iid || known)
  }

  const share = async (e) => {
    e?.stopPropagation?.()
    await writeClipboard(await buildUrl('link'))
    flash('LINK COPIED', 'link')
  }

  const openBet = async (e) => {
    e?.stopPropagation?.()
    const url = await buildUrl('open')
    window.postMessage({ source: 'bet-tracker-widget', type: 'navigate', url }, '*')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openBet(e)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open bet ${known}`}
      onClick={openBet}
      onKeyDown={onKeyDown}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      className={`group relative flex h-10 w-full cursor-pointer flex-row items-center gap-2 border-b border-white/5 px-4 outline-none transition-colors hover:bg-base-600 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/60 ${tint} ${
        bet.__live ? 'animate-row-in' : ''
      }`}
    >
      <AnimatePresence mode="wait">
        {toast ? (
          <motion.span
            key="toast"
            initial={{ opacity: 0, x: 4, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 4, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="pointer-events-none absolute right-14 top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-base-900 shadow-lg"
          >
            {toast}
          </motion.span>
        ) : hover ? (
          <motion.span
            key="hint"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute right-14 top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded bg-base-900 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white shadow-lg ring-1 ring-white/10"
          >
            {hover === 'id' ? 'Copy ID' : 'Share link'}
          </motion.span>
        ) : null}
      </AnimatePresence>

      <span
        className="min-w-0 flex-1 select-none truncate text-left text-xs font-medium capitalize text-white"
        title={formatGameName(bet.game)}
      >
        {formatGameName(bet.game)}
      </span>

      <span className="tnum flex w-24 shrink-0 items-baseline justify-start gap-1 font-mono text-[11px] text-muted">
        {showUsd ? (
          <span className="truncate">{fmtUsd(wagerUsd)}</span>
        ) : (
          <>
            <span className="truncate">{fmtWager(bet.wager, bet.currency)}</span>
            {bet.currency && (
              <span className="shrink-0 text-[9px] uppercase text-muted/70">
                {bet.currency}
              </span>
            )}
          </>
        )}
      </span>

      <span
        className={`tnum w-14 shrink-0 text-left font-mono text-xs ${mult.cls}`}
        style={mult.style}
      >
        {fmtMult(bet.multiplier)}
      </span>

      <span className="flex w-12 shrink-0 items-center justify-end gap-2">
        <button
          onClick={copyId}
          onPointerEnter={() => setHover('id')}
          onPointerLeave={() => setHover((h) => (h === 'id' ? null : h))}
          tabIndex={-1}
          aria-hidden="true"
          className={`rounded outline-none transition-opacity ${
            done === 'id'
              ? 'text-accent opacity-100'
              : busy === 'id'
                ? 'text-muted opacity-100'
                : 'text-white opacity-50 hover:opacity-100'
          }`}
        >
          {busy === 'id' ? <Spinner /> : <ClipboardIcon copied={done === 'id'} />}
        </button>
        <button
          onClick={share}
          onPointerEnter={() => setHover('link')}
          onPointerLeave={() => setHover((h) => (h === 'link' ? null : h))}
          tabIndex={-1}
          aria-hidden="true"
          className={`rounded outline-none transition-opacity ${
            done === 'link'
              ? 'text-accent opacity-100'
              : busy === 'link'
                ? 'text-muted opacity-100'
                : 'text-white opacity-50 hover:opacity-100'
          }`}
        >
          {busy === 'link' ? <Spinner /> : <LinkIcon copied={done === 'link'} />}
        </button>
      </span>
    </div>
  )
}
