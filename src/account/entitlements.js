export const FREE_GAMES = ['keno', 'mines']
const FREE_GAME_SET = new Set(FREE_GAMES)

const normGame = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export const FREE = {
  tier: 'free',
  isPro: false,
  allGames: false,
}

const PRO = {
  tier: 'pro',
  isPro: true,
  allGames: true,
}

export function entitlementsFor(payload) {
  if (payload && payload.valid && payload.tier === 'pro') return PRO
  return FREE
}

export function isGameAllowed(game, entitlement) {
  if (entitlement && entitlement.allGames) return true
  return FREE_GAME_SET.has(normGame(game))
}
