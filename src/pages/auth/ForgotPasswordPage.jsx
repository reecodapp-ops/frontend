import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { forgotPassword } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import logo from '../../assets/images/logo1.png'

const ForgotPasswordPage = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [emailError, setEmailError] = useState('')
    const [loading, setLoading] = useState(false)

    const validate = () => {
        if (!email.trim()) return 'Please enter your email address.'
        if (!/\S+@\S+\.\S+/.test(email)) return "That doesn't look like a valid email."
        return ''
    }

    const handleSubmit = async e => {
        e.preventDefault()
        const err = validate()
        if (err) { setEmailError(err); return }
        setEmailError('')
        setLoading(true)
        try {
            // Always call the API — the server always returns a generic 200 success
            await forgotPassword(email.trim())
        } catch {
            // Intentionally swallow errors — we show the same neutral message regardless
        } finally {
            setLoading(false)
            // Always navigate to reset-password with the same neutral message experience
            navigate('/reset-password', { state: { email: email.trim() } })
        }
    }

    return (
        <div className="min-h-screen bg-bg-gray flex items-center justify-center p-6">
            <div className="w-full max-w-md fade-in">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img src={logo} alt="Reecod" className="h-12 w-auto mb-4 object-contain" />
                    <h1 className="text-2xl font-bold text-navy">Forgot your password?</h1>
                    <p className="text-muted mt-1 text-center">
                        Enter your email and we'll send you a reset code.
                    </p>
                </div>

                <div className="card shadow-modal">
                    <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-primary text-sm">
                        If an account exists for that email, a reset code has been sent.
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <Input
                            id="forgot-email"
                            label="Email address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            error={emailError}
                            left={<Mail size={16} />}
                            autoComplete="email"
                        />

                        <Button type="submit" loading={loading} fullWidth size="lg">
                            Send reset code
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

export default ForgotPasswordPage
