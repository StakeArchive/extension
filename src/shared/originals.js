const ORIGINAL_SLUGS = new Set([
  'dice',
  'limbo',
  'keno',
  'mines',
  'plinko',
  'crash',
  'wheel',
  'hilo',
  'blackjack',
  'diamonds',
  'roulette',
  'baccarat',
  'videopoker',
  'slide',
  'tower',
  'dragontower',
  'scarabspin',
  'cases',
  'casebattles',
  'pump',
  'flip',
  'coinflip',
  'miniroulette',
  'tomeoflife',
  'crashtrenball',
  'rockpaperscissors',
])

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export function isStakeOriginal(bet) {
  if (!bet) return false
  if (norm(bet.provider) === 'stakeoriginals') return true
  return ORIGINAL_SLUGS.has(norm(bet.game))
}
