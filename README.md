<div align="center">

<img src="public/icons/icon128.png" width="96" height="96" alt="StakeArchive logo" />

# StakeArchive

**Keep a private, searchable archive of every Stake bet, long after Stake drops it from your history.**

[Website](https://stakearchive.app) · [Pricing](https://stakearchive.app/pricing) · [Discord](https://discord.com/invite/zHnFrYaF2w)

</div>

---

## Why this repo is public

You're trusting an extension to sit on your Stake tab and read your bets. You should be able to check what it actually does before you install it. So the full source is here to read, audit, and build yourself.

Short version of what we do and don't do:

- Your bet history is stored **on your machine** (browser IndexedDB). We never upload it.
- The extension only runs on Stake domains. It has no access to any other site.
- We never ask for your Stake password, and we never DM you a license key. Anyone who does is a scammer.

The rest of this file explains exactly how, with pointers to the code.

## What it does

Stake only shows your last ~40 bets in the live feed and ~500 on your profile. After that, they're gone from view. StakeArchive quietly captures each of your bets as you play and keeps them, so you can:

- Search and filter your whole history by game, provider, multiplier, or wager.
- Copy a bet's ID or a shareable Stake link in one click — handy when support asks for a Bet ID from a bet you made days ago.
- See running totals (wagered, profit, top multiplier), shown in USD using Stake's own exchange rates so the numbers match what Stake displays.
- Collapse the widget out of the way, or hide it entirely and bring it back from the toolbar icon.

## Your data and your privacy

| | |
| --- | --- |
| **Where bets live** | Local `IndexedDB` in your browser. Never sent to us. See `src/background/index.js`. |
| **Site access** | Stake domains only (`host_permissions` in `manifest.config.js`). Nothing else. |
| **Chrome permissions** | Just `storage`. No `tabs`, no broad host access, no history, no cookies. |
| **How bets are read** | The extension wraps the page's own `WebSocket`/`fetch` in your browser to read the bet data Stake already sends to your screen. See `src/content/inject.js`. |
| **What leaves your browser** | Only a license check (Pro users): the license ID plus a random per-install device hash, sent to our verify endpoint. Never your bets, never your Stake account. See `src/account/license.js`. |
| **USD conversion** | Uses Stake's own `CurrencyConversionRate` on `stake.com`. No third-party price feeds. |

## Free vs Pro

- **Free** tracks Keno and Mines.
- **Pro** tracks every Stake Original and all provider games, with the full archive.

A Pro license is signed with Ed25519 and verified against a public key baked into the build (`VITE_LICENSE_PUBLIC_KEY`). The private signing key never lives in this repo or in the shipped extension — it stays server-side. A license activates on one device; using it in two places at once raises a warning and points you to a support ticket, so keys can't be quietly shared.

## How it works

```
Stake page (MAIN world)          Extension (ISOLATED)            Service worker
──────────────────────           ────────────────────            ──────────────
src/content/inject.js    ──▶      src/content/index.js    ──▶     src/background/index.js
  wraps WebSocket/fetch             window 'message'                IndexedDB store
  reads your bets + rates           chrome.runtime.sendMessage      query + live broadcast
                                                                           │
                                                                           ▼
                                                                    src/popup (React UI)
```

| Path | Role |
| --- | --- |
| `src/content/inject.js` | Runs in the page. Reads bet payloads and Stake's USD rates, forwards them out. |
| `src/content/index.js` | Bridges the page to the extension, stores rates, relays bets to the worker. |
| `src/background/index.js` | IndexedDB store, insert/query API, live broadcast, license heartbeat. |
| `src/popup/*` | React UI: the floating widget, filters, list, stats. |
| `src/account/*` | License verification and entitlements. |
| `src/shared/*` | Message constants and USD helpers. |

## Stack

React 18 · Vite 5 · Tailwind CSS 3 · [@crxjs/vite-plugin](https://crxjs.dev/) (MV3) · [idb](https://github.com/jakearchibald/idb) · framer-motion

## Build it yourself

You don't have to trust our published build — you can produce your own from this source.

```bash
npm install
npm run build      # production build into dist/
```

Then load it:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `dist/` folder
4. Open Stake and play — the widget appears on the right

For development with hot reload, use `npm run dev` instead of `npm run build`.

## Configuration

All build-time settings are public, browser-safe values. Copy the template and fill in your own if you're self-hosting:

```bash
cp .env.example .env.local
```

See `.env.example` for the full list. The signing **private** key is never one of these — it lives only in server secrets.

## Support

- Something broken? Open a ticket in our [Discord](https://discord.com/invite/zHnFrYaF2w).
- Not affiliated with Stake. StakeArchive is an independent tool.

## License

Source is published for transparency and review. All rights reserved — this is not an open-source license and does not grant permission to redistribute or resell. See `LICENSE` for details.
