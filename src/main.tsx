import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'
import QuickSettings from './components/QuickSettings.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <QuickSettings />
  </StrictMode>,
)
