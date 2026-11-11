import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'
import QuickSettings from './components/QuickSettings.tsx'
import ProgressToasts from './components/ProgressToasts.tsx'
import { startTracking } from './online/track'

startTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <QuickSettings />
    <ProgressToasts />
  </StrictMode>,
)
