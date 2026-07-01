import React from 'react'
import { toUsd, fmtUsd } from '../../shared/usd.js'

const FIAT = new Set([
  'usdt', 'usdc', 'dai', 'busd', 'usd', 'eur', 'tusd', 'usdp', 'usdd', 'gusd', 'pyusd',
])

function usdTotals(byCurrency, rates) {
  let wager = 0
  let profit = 0
  for (const e of Object.values(byCurrency || {})) {
    const w = toUsd(e.totalWager, e.currency, rates)
    const p = toUsd(e.profit, e.currency, rates)
    if (w === null || p === null) return null
    wager += w
    profit += p
  }
  return { wager, profit }
}

const fmt = (n, d = 2) =>
  n === undefined || n === null
    ? '\u2014'
    : Number(n).toLocaleString(undefined, {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })

function fmtCompact(n, d = 2) {
  const num = Number(n ?? 0)
  const abs = Math.abs(num)
  const unit = (v, s) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + s
  if (abs >= 1e9) return unit(num / 1e9, 'b')
  if (abs >= 1e6) return unit(num / 1e6, 'm')
  if (abs >= 1e3) return unit(num / 1e3, 'k')
  return fmt(num, d)
}

function fmtAmount(n, currency) {
  const num = Number(n ?? 0)
  if (Math.abs(num) >= 1e3) return fmtCompact(num)
  const fiat = FIAT.has((currency || '').toLowerCase())
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: fiat ? 2 : 8,
  })
}

function valueSize(text) {
  const len = String(text).length
  if (len > 12) return 'text-[10px]'
  if (len > 8) return 'text-xs'
  return 'text-sm'
}

function Stat({ label, value, suffix, tone = 'white', hint }) {
  const toneClass =
    tone === 'pos'
      ? 'text-accent'
      : tone === 'neg'
        ? 'text-loss'
        : tone === 'topmult'
          ? 'text-accent-hi'
          : 'text-white'
  return (
    <div className="flex min-w-0 flex-1 flex-col" title={hint || undefined}>
      <span className="mb-0.5 block text-[10px] font-bold tracking-widest text-muted">
        {label}
      </span>
      <span
        className={`tnum flex h-5 items-baseline overflow-hidden whitespace-nowrap font-semibold leading-none ${valueSize(
          value,
        )} ${toneClass}`}
        title={hint || (suffix ? `${value} ${suffix}` : value)}
      >
        <span className="overflow-hidden text-ellipsis">{value}</span>
        {suffix && <span className="ml-1 shrink-0 text-[9px] text-muted">{suffix}</span>}
      </span>
    </div>
  )
}

export default function StatsBar({ stats, rates }) {
  const byCurrency = stats?.byCurrency || {}
  const usd = usdTotals(byCurrency, rates)

  let wagerText
  let profitText
  let suffix
  let profit
  if (usd) {
    wagerText = fmtUsd(usd.wager)
    profit = usd.profit
    profitText = (profit >= 0 ? '+' : '') + fmtUsd(profit)
    suffix = undefined
  } else {
    const activeCur = stats?.dominant || null
    const money = activeCur ? byCurrency[activeCur] : null
    suffix = activeCur ? activeCur.toUpperCase() : undefined
    profit = money?.profit ?? 0
    wagerText = fmtAmount(money?.totalWager, activeCur)
    profitText = (profit >= 0 ? '+' : '') + fmtAmount(profit, activeCur)
  }

  return (
    <div className="mx-4 mt-2 flex items-start justify-between gap-3 rounded-md bg-base-700 px-4 py-3">
      <Stat label="WAGERED" value={wagerText} suffix={suffix} />
      <Stat
        label="PROFIT"
        value={profitText}
        suffix={suffix}
        tone={profit < 0 ? 'neg' : profit > 0 ? 'pos' : 'white'}
      />
      <Stat
        label="TOP MULT"
        value={`${fmtCompact(stats?.maxMultiplier, 2)}\u00d7`}
        tone="topmult"
      />
    </div>
  )
}
