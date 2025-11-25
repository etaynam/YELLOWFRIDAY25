import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import App from './App.jsx'
import AppVariant from './AppVariant.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import FAQDisplay from './components/FAQDisplay.jsx'
import './index.css'

// Debug component to log current route
function DebugRouter() {
  const location = useLocation()
  
  React.useEffect(() => {
    console.log('🔍 Current route:', location.pathname)
    console.log('🔍 Full location:', location)
  }, [location])
  
  return null
}

function RouterApp() {
  return (
    <BrowserRouter>
      <DebugRouter />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/variant" element={<AppVariant />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/faq-display" element={<FAQDisplay />} />
      </Routes>
    </BrowserRouter>
  )
}

console.log('🚀 App starting...')
console.log('🚀 Routes configured: /, /variant, /admin, /faq-display')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterApp />
  </React.StrictMode>,
)

