export const LICENSE_PUBLIC_KEY = import.meta.env?.VITE_LICENSE_PUBLIC_KEY || ''

export const VERIFY_ENDPOINT =
  import.meta.env?.VITE_VERIFY_ENDPOINT ||
  'https://YOUR-PROJECT.supabase.co/functions/v1/verify-license'

export const PRICING_URL =
  import.meta.env?.VITE_PRICING_URL || 'https://stakearchive.app/pricing'

export const DASHBOARD_URL =
  import.meta.env?.VITE_DASHBOARD_URL || 'https://stakearchive.app/dashboard'

export const DISCORD_URL =
  import.meta.env?.VITE_DISCORD_URL || 'https://discord.com/invite/zHnFrYaF2w'

export const REVERIFY_INTERVAL_MS = 12 * 60 * 60 * 1000
