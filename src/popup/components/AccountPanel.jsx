import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { activateLicense, clearLicense } from '../../account/license.js'
import { PRICING_URL, DASHBOARD_URL } from '../../account/config.js'

const ERRORS = {
  invalid: 'That key is not valid. Copy it exactly from your dashboard.',
  expired: 'This license has expired. Extend it from your dashboard.',
  revoked: 'This license has been revoked.',
  device_limit: 'Device limit reached for this license.',
  rejected: 'This license could not be verified.',
}

function formatExpiry(exp) {
  if (!exp) return '—'
  return new Date(exp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const btn = {
  primary:
    'inline-flex h-8 items-center justify-center rounded-md border border-[#24B47E] bg-accent px-3 text-xs font-medium text-base-900 transition-colors hover:bg-accent-hi disabled:pointer-events-none disabled:opacity-50',
  default:
    'inline-flex h-8 items-center justify-center rounded-md border border-base-500 bg-base-600 px-3 text-xs font-medium text-white transition-colors hover:bg-base-500',
  danger:
    'inline-flex h-8 items-center justify-center rounded-md border border-base-500 bg-base-600 px-3 text-xs font-medium text-muted transition-colors hover:border-loss/60 hover:text-loss',
}

function Row({ label, value, last }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 ${
        last ? '' : 'border-b border-base-600'
      }`}
    >
      <span className="text-xs text-muted">{label}</span>
      {value}
    </div>
  )
}

export default function AccountPanel({ payload, entitlement, onClose, onChanged }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const active = payload?.valid

  const submit = async () => {
    if (!key.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await activateLicense(key)
    setBusy(false)
    if (res.ok) {
      setKey('')
      onChanged?.()
    } else {
      setError(ERRORS[res.error] || ERRORS.invalid)
    }
  }

  const deactivate = async () => {
    await clearLicense()
    onChanged?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-0 z-20 flex flex-col bg-base-750"
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-base-600 px-4 py-3">
        <h2 className="text-sm font-medium text-white">Account</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-accent/60"
          title="Back"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="overflow-hidden rounded-md border border-base-600 bg-base-700">
          <Row
            label="Plan"
            value={
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                  entitlement.isPro ? 'bg-accent/15 text-accent' : 'bg-white/10 text-muted'
                }`}
              >
                {entitlement.tier}
              </span>
            }
          />
          {active && (
            <Row
              label="Expires"
              value={
                <span className="tabular-nums text-xs text-white/80">
                  {payload.plan === 'pro_lifetime' ? 'Never' : formatExpiry(payload.exp)}
                </span>
              }
            />
          )}
          <Row
            label="Tracks"
            value={
              <span className="text-xs text-white/80">
                {entitlement.isPro ? 'All games & providers' : 'Keno & Mines'}
              </span>
            }
            last
          />
        </div>

        {!active && (
          <div className="mt-4">
            <label className="block text-xs text-muted">License key</label>
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your license key"
              rows={3}
              className="mt-1.5 w-full resize-none rounded-md border border-base-500 bg-well px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
            {error && <p className="mt-1.5 text-xs text-loss">{error}</p>}
            <p className="mt-1.5 text-xs text-muted/80">
              Find your key in your{' '}
              <a
                href={DASHBOARD_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-2 transition-colors hover:underline"
              >
                account dashboard
              </a>
              .
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-t border-base-600 px-4 py-3">
        {active ? (
          <>
            <span className="text-xs text-muted">Active on this device</span>
            <button onClick={deactivate} className={btn.danger}>
              Deactivate
            </button>
          </>
        ) : (
          <>
            <a
              href={PRICING_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted underline-offset-2 transition-colors hover:text-accent hover:underline"
            >
              Get Pro
            </a>
            <button onClick={submit} disabled={busy || !key.trim()} className={btn.primary}>
              {busy ? 'Verifying…' : 'Activate'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
