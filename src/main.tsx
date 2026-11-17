import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './frontend/index.css'
import Root from './frontend/Root.tsx'
import QuickSettings from './frontend/components/QuickSettings.tsx'
import ProgressToasts from './frontend/components/ProgressToasts.tsx'
import Atmosphere from './frontend/components/Atmosphere.tsx'
import CookieBanner from './frontend/components/CookieBanner.tsx'
import { applyPrefs, PrefsMotion } from './frontend/prefs.tsx'
import { startTracking } from './backend/track'

startTracking()
applyPrefs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsMotion>
      <Atmosphere />
      <Root />
      <QuickSettings />
      <ProgressToasts />
      <CookieBanner />
    </PrefsMotion>
  </StrictMode>,
)
