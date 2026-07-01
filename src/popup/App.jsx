import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import FilterBar from './components/FilterBar.jsx'
import StatsBar from './components/StatsBar.jsx'
import BetList from './components/BetList.jsx'
import AccountPanel from './components/AccountPanel.jsx'
import ConcurrencyWarning from './components/ConcurrencyWarning.jsx'
import LicenseEndedNotice from './components/LicenseEndedNotice.jsx'
import { useBets } from './hooks/useBets.js'
import { useLicense } from './hooks/useLicense.js'
import { useAlert } from './hooks/useAlert.js'
import { useRates } from './hooks/useRates.js'
import { usePersistentFilters } from './hooks/usePersistentFilters.js'
import { clearBets } from './lib/api.js'
import { MSG } from '../shared/protocol.js'

const DEFAULT_FILTERS = {
  minWager: 0,
  minWagerInput: '',
  minMultiplier: 0,
  minMultiplierInput: '',
  search: '',
  includeZero: false,
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <svg viewBox="0 0 48 48" className="h-9 w-9 text-base-500" fill="none" aria-hidden>
        <rect x="9" y="7" width="30" height="34" rx="3" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M15 16h18M15 24h18M15 32h11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm text-muted">Waiting for live bets…</span>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`flex h-10 items-center gap-3 border-b border-white/5 px-4 ${
            i % 2 === 0 ? 'bg-base-700' : 'bg-base-750'
          }`}
        >
          <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-white/10" />
          <div className="ml-auto h-3 w-10 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

export default function App({ onClose, onHeaderPointerDown }) {
  const [filters, setFilters] = usePersistentFilters(DEFAULT_FILTERS)
  const { bets, stats, loading, loadingMore, hasMore, loadMore, setBets, refresh } =
    useBets(filters)
  const { payload, entitlement, refresh: refreshLicense } = useLicense()
  const { alert, dismiss: dismissAlert } = useAlert()
  const rates = useRates()
  const [confirming, setConfirming] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  useEffect(() => {
    try {
      chrome.runtime.sendMessage({ type: MSG.HEARTBEAT }, () => {
        void chrome.runtime.lastError
      })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(t)
  }, [confirming])

  const handleClear = async () => {
    setConfirming(false)
    await clearBets()
    setBets([])
    refresh()
  }

  const filterKey = `${filters.minWager}|${filters.minMultiplier}|${filters.search}|${filters.includeZero}`

  return (
    <div className="bt-panel relative flex h-full flex-col">
      <header
        onPointerDown={onHeaderPointerDown}
        className="flex flex-shrink-0 cursor-grab items-center justify-between border-b border-base-600 bg-base-900/95 px-4 py-3 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <h1 className="text-sm font-medium text-white">
            StakeArchive
          </h1>
          <button
            onClick={() => setShowAccount(true)}
            title="Account"
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent/60 ${
              entitlement.isPro
                ? 'bg-accent/15 text-accent hover:bg-accent/25'
                : 'bg-white/10 text-muted hover:bg-white/15'
            }`}
          >
            {entitlement.isPro ? 'PRO' : 'FREE'}
          </button>
        </div>
        <div
          className="flex items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {confirming ? (
            <span className="flex items-center gap-2 text-[11px]">
              <span className="text-muted">Clear all?</span>
              <button
                onClick={handleClear}
                className="rounded font-semibold uppercase tracking-wide text-loss outline-none transition-colors hover:text-loss/80 focus-visible:ring-1 focus-visible:ring-loss/60"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded font-semibold uppercase tracking-wide text-muted outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-accent/60"
              >
                No
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded text-xs font-semibold uppercase tracking-wide text-muted outline-none transition-colors duration-200 hover:text-white focus-visible:ring-1 focus-visible:ring-accent/60"
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              title="Hide widget"
              className="ml-1 rounded p-1 text-muted outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-accent/60"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      <StatsBar stats={stats} rates={rates} />
      <FilterBar filters={filters} onChange={setFilters} />

      {loading && bets.length === 0 ? (
        <SkeletonList />
      ) : bets.length > 0 ? (
        <motion.div
          key={filterKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <BetList
            bets={bets}
            rates={rates}
            onLoadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
          />
        </motion.div>
      ) : (stats?.count ?? 0) > 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          No bets match your filters
        </div>
      ) : (
        <div className="flex-1 px-4 pb-4">
          <EmptyState />
        </div>
      )}

      <AnimatePresence>
        {showAccount && (
          <AccountPanel
            payload={payload}
            entitlement={entitlement}
            onClose={() => setShowAccount(false)}
            onChanged={refreshLicense}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alert && alert.kind === 'concurrent' && (
          <ConcurrencyWarning alert={alert} onDismiss={dismissAlert} />
        )}
        {alert && alert.kind === 'revoked' && (
          <LicenseEndedNotice alert={alert} onDismiss={dismissAlert} />
        )}
      </AnimatePresence>
    </div>
  )
}
