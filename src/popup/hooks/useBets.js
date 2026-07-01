import { useCallback, useEffect, useRef, useState } from 'react'
import { MSG } from '../../shared/protocol.js'
import { queryBets, fetchStats } from '../lib/api.js'

const PAGE = 100

const matchesFilters = (bet, f) => {
  if (!f.includeZero && (bet.wager ?? 0) <= 0) return false
  if ((bet.wager ?? 0) < f.minWager) return false
  if ((bet.multiplier ?? 0) < f.minMultiplier) return false
  if (f.search) {
    const hay = `${bet.game} ${bet.provider || ''}`.toLowerCase()
    if (!hay.includes(f.search.toLowerCase())) return false
  }
  return true
}

export function useBets(filters) {
  const [bets, setBets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const betsRef = useRef(bets)
  betsRef.current = bets
  const loadingMoreRef = useRef(false)

  const refresh = useCallback(async () => {
    const [rows, s] = await Promise.all([
      queryBets({ ...filtersRef.current, limit: PAGE }),
      fetchStats({ ...filtersRef.current, search: '' }),
    ])
    setBets(rows)
    setStats(s)
    setHasMore(rows.length === PAGE)
    setLoading(false)
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return
    const current = betsRef.current
    const oldest = current[current.length - 1]?.timestamp
    if (oldest == null) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const rows = await queryBets({
        ...filtersRef.current,
        before: oldest,
        limit: PAGE,
      })
      setBets((prev) => {
        const seen = new Set(prev.map((b) => b.id))
        const fresh = rows.filter((b) => !seen.has(b.id))
        return fresh.length ? [...prev, ...fresh] : prev
      })
      setHasMore(rows.length === PAGE)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(refresh, 300)
    return () => clearTimeout(t)
  }, [
    filters.minWager,
    filters.minMultiplier,
    filters.search,
    filters.includeZero,
    refresh,
  ])

  useEffect(() => {
    let statsTimer = null
    const scheduleStats = () => {
      clearTimeout(statsTimer)
      statsTimer = setTimeout(() => {
        fetchStats({ ...filtersRef.current, search: '' }).then((s) => s && setStats(s))
      }, 400)
    }

    const onMessage = (message) => {
      if (message?.type !== MSG.BET_BROADCAST || !message.bet) return
      const bet = message.bet
      scheduleStats()
      if (!matchesFilters(bet, filtersRef.current)) return
      setBets((prev) => {
        const i = prev.findIndex((b) => b.id === bet.id)
        if (i !== -1) {
          const next = prev.slice()
          next[i] = { ...prev[i], ...bet }
          return next
        }
        return [{ ...bet, __live: true }, ...prev]
      })
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => {
      clearTimeout(statsTimer)
      chrome.runtime.onMessage.removeListener(onMessage)
    }
  }, [])

  return { bets, stats, loading, loadingMore, hasMore, loadMore, refresh, setBets }
}
