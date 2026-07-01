export const STABLE = new Set([
  'usdt', 'usdc', 'dai', 'busd', 'usd', 'tusd', 'usdp', 'usdd', 'gusd', 'pyusd',
])

export function toUsd(amount, currency, rates) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return null
  const c = String(currency || '').toLowerCase()
  const rate = rates && rates[c]
  if (Number.isFinite(rate)) return n * rate
  if (STABLE.has(c)) return n
  return null
}

export function fmtUsd(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}m`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toLocaleString(undefined, { maximumFractionDigits: 2 })}k`
  const maxFrac = abs > 0 && abs < 0.01 ? 4 : 2
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxFrac })}`
}
