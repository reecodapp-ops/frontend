import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Hash } from 'lucide-react'
import { verifyEmail, resendOtp } from '../../api/auth'
import { getAuthErrorMessage } from '../../utils/authErrors'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import logo from '../../assets/images/logo1.png'

const RESEND_COOLDOWN_SECONDS = 60

const VerifyEmailPage = () => {
    const navigate = useNavigate()
    const location = useLocation()

    // Email can come from route state (after Register) or be entered manually
    const initialEmail = location.state?.email || ''
    const [email, setEmail] = useState(initialEmail)
    const [code, setCode] = useState('')
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')

    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState('')
    const [cooldown, setCooldown] = useState(0)
    const timerRef = useRef(null)

    useEffect(() => {
        return () => clearInterval(timerRef.current)
    }, [])

    const startCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => {
        setCooldown(seconds)
        clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0 }
                return prev - 1
            })
        }, 1000)
    }

    const validate = () => {
        const e = {}
        if (!email.trim()) e.email = 'Please enter your email address.'
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = "That doesn't look like a valid email."
        if (!code.trim()) e.code = 'Please enter the 6-digit code.'
        else if (!/^\d{4,10}$/.test(code.trim())) e.code = 'The code must be digits only.'
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
            await verifyEmail(email.trim(), code.trim())
            navigate('/set-password', { state: { email: email.trim(), verified: true } })
        } catch (err) {
            const code = err?.response?.data?.code
            const match = err?.response?.data?.message?.match(/(\d+)\s*second/i)
            if (code === 'resend_too_soon' && match) {
                startCooldown(parseInt(match[1], 10))
            }
            setServerError(getAuthErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setErrors({ email: 'Please enter a valid email to resend code.' })
            return
        }
        setErrors({})
        setResendLoading(true)
        setServerError('')
        setResendSuccess('')
        try {
            await resendOtp(email.trim())
            setResendSuccess('Verification code resent!')
            startCooldown(RESEND_COOLDOWN_SECONDS)
        } catch (err) {
            const code = err?.response?.data?.code
            const match = err?.response?.data?.message?.match(/(\d+)\s*second/i)
            if (code === 'resend_too_soon' && match) {
                startCooldown(parseInt(match[1], 10))
            }
            setServerError(getAuthErrorMessage(err))
        } finally {
            setResendLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-bg-gray flex items-center justify-center p-6">
            <div className="w-full max-w-md fade-in">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img src={logo} alt="Reecod" className="h-12 w-auto mb-4 object-contain" />
                    <h1 className="text-2xl font-bold text-navy">Check your email</h1>
                    <p className="text-muted mt-1 text-center">
                        We sent a 6-digit code to{' '}
                        <span className="font-semibold text-navy">{email || 'your email'}</span>
                    </p>
                </div>

                <div className="card shadow-modal">
                    {serverError && (
                        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
                            {serverError}
                        </div>
                    )}
                    {resendSuccess && (
                        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-success text-sm">
                            {resendSuccess}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        {/* Only show email field if it wasn't passed via route state */}
                        {!initialEmail && (
                            <Input
                                id="verify-email"
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
                            id="verify-code"
                            label="Verification code"
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={10}
                            placeholder="123456"
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            error={errors.code}
                            left={<Hash size={16} />}
                            autoComplete="one-time-code"
                        />

                        <Button type="submit" loading={loading} fullWidth size="lg">
                            Verify email
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        {cooldown > 0 ? (
                            <p className="text-sm text-muted">
                                Resend available in <span className="font-semibold text-navy">{cooldown}s</span>
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendLoading || !email.trim()}
                                className="text-sm text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resendLoading ? 'Sending…' : "Didn't get a code? Resend"}
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center mt-6 text-muted text-sm">
                    Wrong email?{' '}
                    <Link to="/register" className="text-primary font-semibold hover:underline">
                        Start over
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default VerifyEmailPage
