import { useCallback, useEffect, useState } from 'react'

const MUTE_MS = 6 * 60 * 60 * 1000

export function useAlert() {
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    chrome.storage.local.get('bv_alert', (r) => {
      void chrome.runtime.lastError
      setAlert((r && r.bv_alert) || null)
    })
    const onChange = (changes, area) => {
      if (area === 'local' && changes.bv_alert) setAlert(changes.bv_alert.newValue || null)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const dismiss = useCallback(() => {
    try {
      chrome.storage.local.set({ bv_alert: null, bv_alert_mute: Date.now() + MUTE_MS })
    } catch {
      /* ignore */
    }
    setAlert(null)
  }, [])

  return { alert, dismiss }
}
