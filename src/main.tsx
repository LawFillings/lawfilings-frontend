import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/starfield.css'
import App from './App.tsx'

async function mount() {
  // Dev-only: ?storyboard renders the frame-by-frame explainer-video scene (see src/video).
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('storyboard')) {
    const { Storyboard } = await import('./video/Storyboard.tsx')
    createRoot(document.getElementById('root')!).render(<Storyboard />)
    return
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
mount()
