import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'filters'

export function usePersistentFilters(defaults) {
  const [filters, setFilters] = useState(defaults)
  const hydrated = useRef(false)

  useEffect(() => {
    let cancelled = false
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      if (!cancelled && res && res[STORAGE_KEY]) {
        setFilters({ ...defaults, ...res[STORAGE_KEY] })
      }
      hydrated.current = true
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    chrome.storage.local.set({ [STORAGE_KEY]: filters })
  }, [filters])

  return [filters, setFilters]
}
