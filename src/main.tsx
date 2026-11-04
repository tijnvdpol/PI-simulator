import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './styles/theme.css'

const Showroom = lazy(() => import('./showroom/Showroom'))

/** /showroom is een losse bekijk-pagina; alles anders is de simulator. */
const isShowroom = /\/showroom\/?$/.test(location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isShowroom ? (
      <Suspense fallback={<div role="status" className="p-6 text-fg-muted">Showroom wordt geladen…</div>}>
        <Showroom />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
