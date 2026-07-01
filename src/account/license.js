import * as ed from '@noble/ed25519'
import { LICENSE_PUBLIC_KEY, VERIFY_ENDPOINT } from './config.js'
import { entitlementsFor, FREE } from './entitlements.js'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

function b64urlToBytes(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function hexToBytes(hex) {
  const clean = String(hex).trim().replace(/^0x/, '')
  const out = new Uint8Array(Math.floor(clean.length / 2))
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export async function verifyToken(token) {
  try {
    if (!LICENSE_PUBLIC_KEY) return null
    const parts = String(token).split('.')
    if (parts.length !== 2) return null
    const [body, sig] = parts
    const ok = await ed.verifyAsync(
      b64urlToBytes(sig),
      encoder.encode(body),
      hexToBytes(LICENSE_PUBLIC_KEY),
    )
    if (!ok) return null
    const payload = JSON.parse(decoder.decode(b64urlToBytes(body)))
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      return { ...payload, valid: false, expired: true }
    }
    return { ...payload, valid: true }
  } catch {
    return null
  }
}

export async function getDeviceHash() {
  const { bv_device } = await chrome.storage.local.get('bv_device')
  if (bv_device) return bv_device
  const hash = crypto.randomUUID()
  await chrome.storage.local.set({ bv_device: hash })
  return hash
}

export async function getLicenseState() {
  const { bv_license } = await chrome.storage.local.get('bv_license')
  if (!bv_license) return { token: null, payload: null, entitlement: FREE }
  const payload = await verifyToken(bv_license)
  return { token: bv_license, payload, entitlement: entitlementsFor(payload) }
}

export async function activateLicense(token) {
  const trimmed = String(token || '').trim()
  const payload = await verifyToken(trimmed)
  if (!payload || !payload.valid) {
    return { ok: false, error: payload?.expired ? 'expired' : 'invalid' }
  }

  try {
    const deviceHash = await getDeviceHash()
    const res = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licenseId: payload.lic, deviceHash }),
    })
    if (res.ok) {
      const data = await res.json()
      if (!data.valid) return { ok: false, error: data.reason || 'rejected' }
    }
  } catch {
    void 0
  }

  const entitlement = entitlementsFor(payload)
  await chrome.storage.local.set({ bv_license: trimmed })
  return { ok: true, payload, entitlement }
}

export async function clearLicense() {
  await chrome.storage.local.remove(['bv_license', 'bv_entitlement'])
}

export async function heartbeat() {
  const { bv_license } = await chrome.storage.local.get('bv_license')
  if (!bv_license) return null
  const payload = await verifyToken(bv_license)
  if (!payload || !payload.valid || !payload.lic) return null
  try {
    const deviceHash = await getDeviceHash()
    const res = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licenseId: payload.lic, deviceHash, action: 'heartbeat' }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
