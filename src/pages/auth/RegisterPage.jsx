import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail } from 'lucide-react'
import { register } from '../../api/auth'
import { getAuthErrorMessage } from '../../utils/authErrors'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import logo from '../../assets/images/logo1.png'

const RegisterPage = () => {
    const navigate = useNavigate()
    const [form, setForm] = useState({ full_name: '', email: '' })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

    const validate = () => {
        const e = {}
        const name = form.full_name.trim()
        if (!name) e.full_name = 'Please enter your full name.'
        else if (name.length > 150) e.full_name = 'Name must be 150 characters or fewer.'
        if (!form.email.trim()) e.email = 'Please enter your email address.'
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "That doesn't look like a valid email."
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
            await register(form.full_name.trim(), form.email.trim())
            navigate('/verify-email', { state: { email: form.email.trim() } })
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
                    <h1 className="text-2xl font-bold text-navy">Create your account</h1>
                    <p className="text-muted mt-1 text-center">It only takes a minute to get started.</p>
                </div>

                <div className="card shadow-modal">
                    {serverError && (
                        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
                            {serverError}
                            {serverError.includes('already exists') && (
                                <>{' '}<Link to="/login" className="font-semibold underline">Log in</Link></>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <Input
                            id="reg-name"
                            label="Full name"
                            placeholder="e.g. Grace Nakato"
                            value={form.full_name}
                            onChange={set('full_name')}
                            error={errors.full_name}
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
                </div>

                <p className="text-center mt-6 text-muted text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default RegisterPage
