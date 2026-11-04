import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="p-4">Pi-simulator</div>
  </StrictMode>,
)
