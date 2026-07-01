// Generates an Ed25519 keypair for StakeArchive license signing.
//   - LICENSE_PRIVATE_KEY  → Supabase secret (server signs tokens with it)
//   - VITE_LICENSE_PUBLIC_KEY → extension env (verifies tokens offline)
// Uses the same @noble/ed25519 the backend + extension use, so the keys are
// guaranteed compatible. Run: node scripts/gen-license-key.mjs
import * as ed from '@noble/ed25519'
import { createHash } from 'node:crypto'

ed.etc.sha512Sync = (...m) => createHash('sha512').update(ed.etc.concatBytes(...m)).digest()

const toHex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('')

const priv = ed.utils.randomPrivateKey()
const pub = ed.getPublicKey(priv)

console.log('LICENSE_PRIVATE_KEY=' + toHex(priv))
console.log('VITE_LICENSE_PUBLIC_KEY=' + toHex(pub))
