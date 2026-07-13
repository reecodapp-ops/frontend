import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail } from 'lucide-react'
import api from '../../api/axios'
import { getAuthErrorMessage } from '../../utils/authErrors'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const Step1Account = ({ onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    const name = form.name.trim()
    if (!name) e.name = 'Please enter your full name.'
    else if (name.length > 150) e.name = 'Name must be 150 characters or fewer.'
    if (!form.email.trim()) e.email = 'Please enter your email address.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "That email doesn't look right."
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
      const res = await api.post('/auth/register', {
        full_name: form.name.trim(),
        email: form.email.trim(),
      })
      // Register no longer returns tokens — just pass user data forward
      onSuccess(res.data)
    } catch (err) {
      setServerError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card shadow-modal">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-navy">Create your account</h2>
        <p className="text-muted mt-1.5">It only takes a minute to get started.</p>
      </div>

      {serverError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          id="reg-name"
          label="Your full name"
          placeholder="e.g. Grace Nakato"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          left={<User size={16} />}
          autoComplete="name"
        />
        <Input
          id="reg-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          left={<Mail size={16} />}
          autoComplete="email"
        />

        <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
          Continue
        </Button>
      </form>

      <p className="text-center mt-5 text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

export default Step1Account
