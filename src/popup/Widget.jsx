import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'framer-motion'
import App from './App.jsx'
import { MSG } from '../shared/protocol.js'

const MAX_H = 600
const MARGIN = 12
const FAB = 48

const GENTLE = [0.32, 0.72, 0, 1]

function layoutFor(open) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : MAX_H
  const elH = open ? Math.min(MAX_H, vh - MARGIN * 2) : FAB
  const slack = Math.max(0, (vh - elH) / 2 - MARGIN)
  return { elH, constraints: { top: -slack, bottom: slack } }
}

function Fab({ onPointerDown, onClick, onDismiss }) {
  return (
    <div className="group relative" style={{ pointerEvents: 'auto' }}>
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        onPointerDown={onPointerDown}
        onClick={onClick}
        title="Open StakeArchive"
        className="flex h-12 w-12 cursor-grab items-center justify-center rounded-xl border border-base-500 bg-base-700 shadow-lg transition-colors duration-200 hover:border-accent/50 hover:bg-base-600 active:cursor-grabbing"
      >
        <svg
          viewBox="1 0.5 22 22"
          className="h-6 w-6 text-accent transition-transform duration-200 group-hover:scale-110"
          fill="currentColor"
          fillRule="evenodd"
          aria-hidden
        >
          <path d="M11.25 17.25h-1.5v1.538h1.5v.69h1.568V11.9a3.8 3.8 0 002.932-3.65 3.75 3.75 0 10-4.5 3.675v2.325H9v1.537h2.25zM12 .75l9 3.75v6.166c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V4.5zm0 5.438a2.062 2.062 0 110 4.124 2.062 2.062 0 010-4.124" />
        </svg>
      </motion.button>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDismiss}
        title="Hide widget"
        aria-label="Hide widget"
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-base-900 text-white opacity-0 shadow-md outline-none transition-all duration-150 hover:border-white/60 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-accent/60 group-hover:opacity-100"
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" aria-hidden>
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

export default function Widget() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [layout, setLayout] = useState(() => layoutFor(false))
  const controls = useDragControls()
  const draggedRef = useRef(false)
  const y = useMotionValue(0)

  useEffect(() => {
    const apply = () => {
      const l = layoutFor(open)
      setLayout(l)
      const cur = y.get()
      const clamped = Math.max(l.constraints.top, Math.min(l.constraints.bottom, cur))
      if (clamped !== cur) y.set(clamped)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [open, y])

  useEffect(() => {
    const onMessage = (message) => {
      if (message?.type === MSG.SHOW_WIDGET) {
        setDismissed(false)
        setOpen(true)
      }
    }
    try {
      chrome.runtime.onMessage.addListener(onMessage)
    } catch {
      /* ignore */
    }
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(onMessage)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const startDrag = (e) => {
    draggedRef.current = false
    controls.start(e)
  }

  const toggle = () => {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    setOpen((o) => !o)
  }

  return (
    <div
      className="fixed z-[999999]"
      style={{
        top: '50%',
        right: open ? MARGIN : 6,
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            key="wrap"
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragMomentum={false}
            dragElastic={0.04}
            dragConstraints={layout.constraints}
            onDragStart={() => {
              draggedRef.current = true
            }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2, ease: GENTLE }}
            style={{ y, pointerEvents: 'none' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.div
                  key="panel"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={{
                    duration: 0.34,
                    ease: GENTLE,
                    opacity: { duration: 0.22, ease: 'easeOut' },
                  }}
                  style={{
                    height: layout.elH,
                    pointerEvents: 'auto',
                    transformOrigin: 'center right',
                  }}
                  className="bt-panel flex w-[400px] flex-col rounded-lg border border-base-600 shadow-2xl"
                >
                  <App onClose={() => setOpen(false)} onHeaderPointerDown={startDrag} />
                </motion.div>
              ) : (
                <motion.div
                  key="fab"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.26, ease: GENTLE }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <Fab
                    onPointerDown={startDrag}
                    onClick={toggle}
                    onDismiss={() => setDismissed(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
