import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import SetPasswordPage from './pages/auth/SetPasswordPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

import OnboardingShell from './pages/onboarding/OnboardingShell'
import DashboardPage from './pages/dashboard/DashboardPage'
import DebtPriorityPage from './pages/dashboard/DebtPriorityPage'
import RecordSalePage from './pages/sales/RecordSalePage'
import SalesListPage from './pages/sales/SalesListPage'
import CustomersPage from './pages/customers/CustomersPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import ProductsPage from './pages/products/ProductsPage'
import MarginsPage from './pages/products/MarginsPage'
import ExpensesPage from './pages/expenses/ExpensesPage'
import StockPurchasesPage from './pages/stock-purchases/StockPurchasesPage'
import CapitalPage from './pages/capital/CapitalPage'
import CorrectionsPage from './pages/corrections/CorrectionsPage'
import SettingsPage from './pages/settings/SettingsPage'

// Redirects to /login if not authenticated
const Protected = ({ children }) => {
  const { isAuthenticated, isLoading, hasBusiness } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-gray flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-muted text-sm font-medium">Loading Reecod…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isCurrentlyOnboarding = window.location.pathname.startsWith('/onboarding')

  if (!hasBusiness && !isCurrentlyOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  if (hasBusiness && isCurrentlyOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Redirects to /dashboard or /onboarding if already authenticated
const GuestOnly = ({ children }) => {
  const { isAuthenticated, isLoading, hasBusiness } = useAuth()
  if (isLoading) return null
  if (isAuthenticated) {
    return <Navigate to={hasBusiness ? '/dashboard' : '/onboarding'} replace />
  }
  return children
}

const App = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Auth routes (guest-only unless noted) ── */}
      <Route
        path="/login"
        element={<GuestOnly><LoginPage /></GuestOnly>}
      />
      <Route
        path="/register"
        element={<GuestOnly><RegisterPage /></GuestOnly>}
      />
      {/* Verify-email and set-password are mid-flow public routes (not GuestOnly) */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route
        path="/forgot-password"
        element={<GuestOnly><ForgotPasswordPage /></GuestOnly>}
      />
      {/* Reset-password is public — user may not be logged in */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Business onboarding (moved from /register – requires auth) */}
      <Route
        path="/onboarding"
        element={<Protected><OnboardingShell /></Protected>}
      />

      {/* ── Protected app routes ── */}
      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />

      {/* Sales — list, create, and edit all live under /sales.
          RecordSalePage handles both create (/sales/new) and edit
          (/sales/:id/edit) since it reads useParams().id to switch modes. */}
      <Route path="/sales" element={<Protected><SalesListPage /></Protected>} />
      <Route path="/sales/new" element={<Protected><RecordSalePage /></Protected>} />
      <Route path="/sales/:id/edit" element={<Protected><RecordSalePage /></Protected>} />
      {/* Kept for backward compatibility with any existing links/bookmarks */}
      <Route path="/record-sale" element={<Protected><RecordSalePage /></Protected>} />

      <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
      <Route path="/suppliers" element={<Protected><SuppliersPage /></Protected>} />
      <Route path="/products" element={<Protected><ProductsPage /></Protected>} />
      <Route path="/expenses" element={<Protected><ExpensesPage /></Protected>} />
      <Route path="/stock-purchases" element={<Protected><StockPurchasesPage /></Protected>} />
      <Route path="/capital" element={<Protected><CapitalPage /></Protected>} />
      <Route path="/corrections" element={<Protected><CorrectionsPage /></Protected>} />
      <Route path="/debt-priority" element={<Protected><DebtPriorityPage /></Protected>} />
      <Route path="/margins" element={<Protected><MarginsPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

      {/* 404 fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-bg-gray flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-bold text-border mb-4">404</p>
              <p className="text-navy font-semibold text-xl mb-2">Page not found</p>
              <p className="text-muted mb-6">This page doesn't exist.</p>
              <a href="/dashboard" className="btn-primary inline-flex px-6 py-3">
                Go to dashboard
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

export default App
