import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { setPassword as setPasswordRequest } from '../../api/auth'
import { setTokens } from '../../api/axios'
import { getAuthErrorMessage } from '../../utils/authErrors'
import { useAuth } from '../../context/AuthContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import logo from '../../assets/images/logo1.png'

const SetPasswordPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { setUser, setIsAuthenticated, setBusinesses } = useAuth()

    const email = location.state?.email || ''
    const [form, setForm] = useState({ password: '', confirm: '' })
    const [errors, setErrors] = useState({})
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

    const validate = () => {
        const e = {}
        if (!form.password) e.password = 'Please create a password.'
        else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
        else if (form.password.length > 128) e.password = 'Password must be 128 characters or fewer.'
        if (!form.confirm) e.confirm = 'Please confirm your password.'
        else if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
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
            const res = await setPasswordRequest(email, form.password)
            const {
                access_token,
                refresh_token,
                user: userData,
                businesses: bizList = [],
                has_business: hasBiz = false,
            } = res.data

            setTokens(access_token, refresh_token)
            setUser(userData)
            // Apply businesses from the response — new accounts always have has_business: false
            setBusinesses(bizList)
            setIsAuthenticated(true)

            // Route based on server-provided boolean, not recomputed from array length
            navigate(hasBiz ? '/dashboard' : '/onboarding', { replace: true })
        } catch (err) {
            const code = err?.response?.data?.code
            if (code === 'email_not_verified') {
                navigate('/verify-email', { state: { email } })
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
                    <h1 className="text-2xl font-bold text-navy">Set your password</h1>
                    <p className="text-muted mt-1 text-center">
                        Almost done!
                        {email && (
                            <> Creating account for <span className="font-semibold text-navy">{email}</span></>
                        )}
                    </p>
                </div>

                <div className="card shadow-modal">
                    {serverError && (
                        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <Input
                            id="set-password"
                            label="New password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="At least 8 characters"
                            value={form.password}
                            onChange={set('password')}
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
                            autoComplete="new-password"
                        />
                        <Input
                            id="set-confirm"
                            label="Confirm password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="Repeat your password"
                            value={form.confirm}
                            onChange={set('confirm')}
                            error={errors.confirm}
                            left={<Lock size={16} />}
                            autoComplete="new-password"
                        />

                        <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
                            Set password &amp; log in
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default SetPasswordPage
