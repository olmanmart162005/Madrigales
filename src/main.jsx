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
    console.log('Madrigales Pastelería está lista para uso offline')
  },
  immediate: true,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
