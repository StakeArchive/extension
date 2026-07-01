import React from 'react'
import { createRoot } from 'react-dom/client'
import Widget from '../popup/Widget.jsx'
import cssText from '../popup/index.css?inline'

const HOST_ID = 'bet-tracker-root'

function inject() {
  if (document.getElementById(HOST_ID)) return
  const parent = document.body || document.documentElement
  if (!parent) return

  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'inset: 0',
    'width: 100%',
    'height: 100%',
    'z-index: 999999',
    'pointer-events: none',
  ].join(';')

  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = cssText
  shadow.appendChild(style)

  const mountPoint = document.createElement('div')
  mountPoint.style.pointerEvents = 'none'
  shadow.appendChild(mountPoint)

  parent.appendChild(host)

  createRoot(mountPoint).render(
    <React.StrictMode>
      <Widget />
    </React.StrictMode>,
  )
}

inject()

const observer = new MutationObserver(() => {
  if (!document.getElementById(HOST_ID)) inject()
})
const startObserving = () => {
  if (document.body) {
    observer.observe(document.body, { childList: true })
  } else {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true })
  }
}
startObserving()
