import React, { useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import BetRow from './BetRow.jsx'

const ROW_HEIGHT = 40
const NEAR_BOTTOM = 240

export default function BetList({ bets, rates, onLoadMore, hasMore, loadingMore }) {
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: bets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (i) => bets[i].id,
  })

  const onScroll = useCallback(
    (e) => {
      if (!hasMore || loadingMore) return
      const el = e.currentTarget
      if (el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM) {
        onLoadMore?.()
      }
    },
    [hasMore, loadingMore, onLoadMore],
  )

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className="scrollbar-thin flex-1 overflow-y-auto [contain:layout]"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={vi.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: ROW_HEIGHT,
              transform: `translateY(${vi.start}px)`,
            }}
          >
            <BetRow bet={bets[vi.index]} index={vi.index} rates={rates} />
          </div>
        ))}
      </div>
      {loadingMore && (
        <div className="py-2 text-center text-[10px] font-medium tracking-widest text-muted/60">
          LOADING…
        </div>
      )}
    </div>
  )
}
