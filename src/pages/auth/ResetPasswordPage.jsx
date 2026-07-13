import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Hash, Lock, Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '../../api/auth'
import { getAuthErrorMessage } from '../../utils/authErrors'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import logo from '../../assets/images/logo1.png'

const ResetPasswordPage = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const initialEmail = location.state?.email || ''
    const [email, setEmail] = useState(initialEmail)
    const [form, setForm] = useState({ code: '', new_password: '', confirm: '' })
    const [errors, setErrors] = useState({})
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

    const validate = () => {
        const e = {}
        if (!email.trim()) e.email = 'Please enter your email address.'
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = "That doesn't look like a valid email."
        if (!form.code.trim()) e.code = 'Please enter the reset code.'
        else if (!/^\d{4,10}$/.test(form.code.trim())) e.code = 'The code must be digits only.'
        if (!form.new_password) e.new_password = 'Please enter a new password.'
        else if (form.new_password.length < 8) e.new_password = 'Password must be at least 8 characters.'
        else if (form.new_password.length > 128) e.new_password = 'Password must be 128 characters or fewer.'
        if (!form.confirm) e.confirm = 'Please confirm your new password.'
        else if (form.new_password !== form.confirm) e.confirm = 'Passwords do not match.'
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
            await resetPassword(email.trim(), form.code.trim(), form.new_password)
            navigate('/login', { state: { toast: 'Password reset. You can now log in.' } })
        } catch (err) {
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
                    <h1 className="text-2xl font-bold text-navy">Reset your password</h1>
                    <p className="text-muted mt-1 text-center">
                        Enter the code from your email and choose a new password.
                    </p>
                </div>

                <div className="card shadow-modal">
                    {serverError && (
                        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        {/* Show email field only if not passed from ForgotPassword */}
                        {!initialEmail && (
                            <Input
                                id="reset-email"
                                label="Email address"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                error={errors.email}
                                left={<Mail size={16} />}
                                autoComplete="email"
                            />
                        )}

                        <Input
                            id="reset-code"
                            label="Reset code"
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={10}
                            placeholder="123456"
                            value={form.code}
                            onChange={e => setForm(f => ({ ...f, code: e.target.value.replace(/\D/g, '') }))}
                            error={errors.code}
                            left={<Hash size={16} />}
                            autoComplete="one-time-code"
                        />

                        <Input
                            id="reset-new-password"
                            label="New password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="At least 8 characters"
                            value={form.new_password}
                            onChange={set('new_password')}
                            error={errors.new_password}
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
                            autoComplete="new-password"
                        />

                        <Input
                            id="reset-confirm"
                            label="Confirm new password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="Repeat your new password"
                            value={form.confirm}
                            onChange={set('confirm')}
                            error={errors.confirm}
                            left={<Lock size={16} />}
                            autoComplete="new-password"
                        />

                        <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
                            Reset password
                        </Button>
                    </form>
                </div>

                <p className="text-center mt-6 text-muted text-sm">
                    Remember your password?{' '}
                    <a href="/login" className="text-primary font-semibold hover:underline">
                        Log in
                    </a>
                </p>
            </div>
        </div>
    )
}

export default ResetPasswordPage
