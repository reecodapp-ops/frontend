import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getAuthErrorMessage } from '../../utils/authErrors'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import logo from '../../assets/images/logo1.png'

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')

  // Success toast from ResetPasswordPage
  const [toast, setToast] = useState(location.state?.toast || '')
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 5000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Please enter your email address.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "That doesn't look like a valid email."
    if (!form.password) e.password = 'Please enter your password.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setServerError('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const code = err?.response?.data?.code
      if (code === 'email_not_verified') {
        navigate('/verify-email', { state: { email: form.email.trim() } })
        return
      }
      setServerError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-gray flex items-center justify-center p-6">
      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Reecod" className="h-12 w-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
          <p className="text-muted mt-1 text-center">Log in to your Reecod account</p>
        </div>

        <div className="card shadow-modal">
          {toast && (
            <div className="mb-5 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-success text-sm">
              {toast}
            </div>
          )}

          {serverError && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              left={<Mail size={16} />}
              autoComplete="email"
            />

            <Input
              id="login-password"
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="Your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              error={errors.password}
              left={<Lock size={16} />}
              right={
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="text-muted hover:text-navy transition-colors pointer-events-auto"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="current-password"
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">
              Log in
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-muted text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Create one — it's free
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
