import { useEffect, useState } from 'react'

const RATES_KEY = 'sa_rates'

export function useRates() {
  const [rates, setRates] = useState({})

  useEffect(() => {
    let alive = true
    chrome.storage.local.get(RATES_KEY, (r) => {
      void chrome.runtime.lastError
      if (alive && r && r[RATES_KEY]?.rates) setRates(r[RATES_KEY].rates)
    })

    const onChanged = (changes, area) => {
      if (area === 'local' && changes[RATES_KEY]?.newValue?.rates) {
        setRates(changes[RATES_KEY].newValue.rates)
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      alive = false
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [])

  return rates
}
