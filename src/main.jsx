import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Registro automático del Service Worker para soporte WebAPK / Standalone PWA completo
const updateSW = registerSW({
  onNeedRefresh() {
    // Si hay una nueva versión disponible, refrescar automáticamente
    updateSW(true)
  },
  onOfflineReady() {
    console.log('Nani Cake está lista para uso offline')
  },
  // Buscar versiones nuevas también cuando la app vuelve a primer plano
  // (en celular la app instalada puede quedar abierta días sin recargarse)
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const check = () => registration.update().catch(() => {})
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    window.addEventListener('focus', check)
    setInterval(check, 30 * 60 * 1000)
  },
  immediate: true,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
