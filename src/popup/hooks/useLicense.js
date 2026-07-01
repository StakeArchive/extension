import { useCallback, useEffect, useState } from 'react'
import { getLicenseState } from '../../account/license.js'
import { FREE } from '../../account/entitlements.js'

export function useLicense() {
  const [state, setState] = useState({ token: null, payload: null, entitlement: FREE })

  const refresh = useCallback(() => {
    getLicenseState().then(setState)
  }, [])

  useEffect(() => {
    refresh()
    const onChange = (changes, area) => {
      if (area === 'local' && changes.bv_license) refresh()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh])

  return { ...state, refresh }
}
