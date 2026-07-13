import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'
// i18n must be imported before <App> so the instance is initialised
// before any component tries to call useTranslation()
import './i18n'
import './styles/fonts.css'
import './styles/theme.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/*
      Suspense is required because i18next-http-backend loads translation
      files asynchronously. React will show the fallback until the active
      language's JSON is fetched and parsed.
    */}
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-gray flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
            <p className="text-muted text-sm font-medium">Loading…</p>
          </div>
        </div>
      }
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Suspense>
  </StrictMode>
)
