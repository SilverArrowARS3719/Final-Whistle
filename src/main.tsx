import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './frontend/index.css'
import Root from './frontend/Root.tsx'
import QuickSettings from './frontend/components/QuickSettings.tsx'
import ProgressToasts from './frontend/components/ProgressToasts.tsx'
import Atmosphere from './frontend/components/Atmosphere.tsx'
import { startTracking } from './backend/track'

startTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Atmosphere />
    <Root />
    <QuickSettings />
    <ProgressToasts />
  </StrictMode>,
)
