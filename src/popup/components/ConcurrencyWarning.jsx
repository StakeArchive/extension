import React from 'react'
import { motion } from 'framer-motion'
import { DISCORD_URL } from '../../account/config.js'

export default function ConcurrencyWarning({ alert, onDismiss }) {
  const active = Number(alert?.activeCount) || 0
  const allowed = Number(alert?.allowed) || 2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-0 z-30 flex flex-col bg-base-900/95 backdrop-blur-sm"
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-loss/15 text-loss">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path
              d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <h2 className="mt-4 text-sm font-semibold text-white">
          Your key is active on too many devices
        </h2>
        <p className="mt-2 max-w-[16rem] text-xs leading-relaxed text-muted">
          We&rsquo;re seeing this license on {active} devices at once. Your plan covers {allowed}.
          If this isn&rsquo;t you, someone else has your key.
        </p>
        <p className="mt-2 max-w-[16rem] text-xs leading-relaxed text-muted">
          Open a ticket on Discord and we&rsquo;ll help you secure it. We never disable a key on
          our own.
        </p>

        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md border border-[#24B47E] bg-accent px-4 text-xs font-medium text-base-900 transition-colors hover:bg-accent-hi"
        >
          Open a Discord ticket
        </a>
        <button
          onClick={onDismiss}
          className="mt-2 inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium text-muted outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-accent/60"
        >
          This was me, dismiss
        </button>
      </div>
    </motion.div>
  )
}
