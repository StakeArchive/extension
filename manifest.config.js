import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' assert { type: 'json' }

const STAKE_HOSTS = [
  'stake.com',
  'stake.us',
  'stake.com.co',
  'stake.mx',
  'stake.pe',
  'stake.bet.br',
  'stake.bet',
  'stake.games',
  'stake.pet',
  'stake.ac',
  'stake.mba',
  'stake.jp',
  'stake.bz',
  'stake.ceo',
  'stake.krd',
  'stake.tr',
  'staketr.com',
]

for (const [lo, hi] of [
  [1000, 1099],
  [3000, 3099],
]) {
  for (let n = lo; n <= hi; n += 1) STAKE_HOSTS.push(`stake${n}.com`)
}

const STAKE_MATCHES = STAKE_HOSTS.map((h) => `*://*.${h}/*`)

export default defineManifest({
  manifest_version: 3,
  name: 'StakeArchive',
  version: pkg.version,
  description: 'Keep a private, searchable archive of every Stake bet, with one-click Bet IDs, long after Stake drops them from your history.',
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_title: 'StakeArchive (injected on Stake)',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
  content_scripts: [
    {
      matches: STAKE_MATCHES,
      js: ['src/content/inject.js'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
    {
      matches: STAKE_MATCHES,
      js: ['src/content/index.js'],
      run_at: 'document_start',
      all_frames: true,
    },
    {
      matches: STAKE_MATCHES,
      js: ['src/content/ui-injector.jsx'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/content/inject.js'],
      matches: STAKE_MATCHES,
    },
  ],
  host_permissions: STAKE_MATCHES,
  permissions: ['storage'],
})
