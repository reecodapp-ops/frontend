import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

const ReLoginModal = ({ onSuccess }) => {
  const { user, login } = useAuth()
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!password) {
      setError('Please enter your password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(user?.email, password)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md p-6 space-y-4 fade-in">
        <div className="text-center">
          <h2 className="text-lg font-bold text-navy">Session expired</h2>
          <p className="text-muted text-xs mt-1">Please enter your password to resume recording your sale.</p>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <div className="input-field bg-bg-gray text-muted text-sm border-border/50 font-medium select-none">
              {user?.email || 'your email'}
            </div>
          </div>

          <Input
            id="re-login-password"
            label="Password"
            type={showPass ? 'text' : 'password'}
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
          />

          <Button type="submit" loading={loading} fullWidth size="lg">
            Confirm &amp; Resume
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ReLoginModal
