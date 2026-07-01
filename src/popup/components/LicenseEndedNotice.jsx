import React from 'react'
import { motion } from 'framer-motion'
import { DASHBOARD_URL, DISCORD_URL } from '../../account/config.js'

export default function LicenseEndedNotice({ alert, onDismiss }) {
  const revoked = alert?.reason === 'revoked'
  const title = revoked ? 'Your Pro key was deactivated' : 'Your Pro access has ended'
  const body = revoked
    ? 'This key is no longer active. If you think this is a mistake, open a ticket on Discord and we will sort it out.'
    : 'You are back on Free. Keno and Mines stay tracked and your saved bets are kept.'

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
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>

        <h2 className="mt-4 text-sm font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-[16rem] text-xs leading-relaxed text-muted">{body}</p>

        <a
          href={revoked ? DISCORD_URL : DASHBOARD_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-md border border-[#24B47E] bg-accent px-4 text-xs font-medium text-base-900 transition-colors hover:bg-accent-hi"
        >
          {revoked ? 'Open a Discord ticket' : 'Manage your plan'}
        </a>
        <button
          onClick={onDismiss}
          className="mt-2 inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium text-muted outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-accent/60"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}
