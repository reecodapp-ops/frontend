import { useState, useEffect } from 'react'
import { Save, Building2, User, LogOut, MapPin, Globe, Loader2, Languages } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'
import PhoneNumberInput, { parseE164 } from '../../components/ui/PhoneNumberInput'
import { useAuth, mapBusinessTypeToId } from '../../context/AuthContext'
import api from '../../api/axios'

const BUSINESS_TYPES = [
  { id: 'retail',    label: 'Retail shop', emoji: '🛒' },
  { id: 'boutique',  label: 'Boutique',    emoji: '👗' },
  { id: 'wholesale', label: 'Wholesale',   emoji: '📦' },
  { id: 'pharmacy',  label: 'Pharmacy',    emoji: '💊' },
  { id: 'hardware',  label: 'Hardware',    emoji: '🔧' },
  { id: 'other',     label: 'Other',       emoji: '🏪' },
]

const SettingsPage = () => {
  const { user, business, updateBusiness, logout } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name:               business?.name               || '',
    phone:              business?.phone              || '',
    phone_country_id:   '',
    phone_local_number: '',
    location:           business?.location           || '',
    currency:           business?.currency           || 'UGX',
    currency_id:        '',
    country_id:         business?.country_id         || '',
    business_type:      business?.business_type      || '',
  })
  const [errors,      setErrors]      = useState({})
  const [loading,     setLoading]     = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [serverError, setServerError] = useState('')
  const [loggingOut,  setLoggingOut]  = useState(false)

  // Lookup data
  const [currencies,    setCurrencies]    = useState([])
  const [countries,     setCountries]     = useState([])
  const [loadingLookup, setLoadingLookup] = useState(true)

  // Load currencies + countries dynamically
  useEffect(() => {
    let cancelled = false
    const loadLookups = async () => {
      try {
        const [currRes, countryRes] = await Promise.all([
          api.get('/currencies'),
          api.get('/countries'),
        ])
        if (cancelled) return
        setCurrencies((currRes.data || []).filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order))
        setCountries((countryRes.data || []).filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order))
      } catch {
        // Non-fatal
      } finally {
        if (!cancelled) setLoadingLookup(false)
      }
    }
    loadLookups()
    return () => { cancelled = true }
  }, [])

  // Refresh business data on mount; backfill currency_id once currencies are loaded
  useEffect(() => {
    if (!business?.id) return
    api.get(`/businesses/${business.id}`).then(res => {
      const b = res.data
      updateBusiness(b)
      setForm(f => {
        let updated = {
          ...f,
          name:          b.shop_name    || b.name     || '',
          phone:         b.phone_number || b.phone     || '',
          location:      b.location                    || '',
          currency:      b.currency?.iso_code || b.currency_code || b.currency || f.currency,
          currency_id:   b.currency?.id       || b.currency_id   || f.currency_id,
          country_id:    b.country_id                 ?? '',
          business_type: b.business_type               || '',
        }
        if (updated.phone && countries.length > 0) {
          const { countryId, localNumber } = parseE164(updated.phone, countries)
          updated.phone_country_id = countryId || ''
          updated.phone_local_number = localNumber || ''
        }
        return updated
      })
    }).catch(() => { })
  }, [business?.id, countries])

  // Parse phone if countries load late
  useEffect(() => {
    if (!countries.length) return
    setForm(f => {
      if (f.phone && !f.phone_local_number) {
        const { countryId, localNumber } = parseE164(f.phone, countries)
        return {
          ...f,
          phone_country_id: countryId || '',
          phone_local_number: localNumber || '',
        }
      }
      return f
    })
  }, [countries])

  // Once currencies load, backfill currency_id if still missing
  useEffect(() => {
    if (!currencies.length) return
    setForm(f => {
      if (f.currency_id) return f
      const match = currencies.find(c => c.iso_code === f.currency)
      return match ? { ...f, currency_id: match.id } : f
    })
  }, [currencies])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Shop name is required.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setServerError('')
    setSaved(false)
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const payload = {
        shop_name:          form.name.trim(),
        phone_country_id:   form.phone_country_id ? Number(form.phone_country_id) : null,
        phone_local_number: form.phone_local_number ? form.phone_local_number.trim() : null,
        location:           form.location.trim() || null,
        currency_id:        form.currency_id ? Number(form.currency_id) : undefined,
        business_type_id:   mapBusinessTypeToId(form.business_type),
      }
      if (form.country_id) payload.country_id = Number(form.country_id)

      const res = await api.patch(`/businesses/${business.id}`, payload)
      updateBusiness(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      if (err.response?.data?.code === 'invalid_phone_number' || err.response?.data?.detail?.toLowerCase().includes('phone')) {
        setErrors(prev => ({ ...prev, phone: err.response?.data?.detail || 'Invalid phone number.' }))
      } else {
        setServerError(err.response?.data?.detail || 'Could not save settings.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await api.post('/auth/logout')
    } catch { /* fire-and-forget */ }
    logout()
    navigate('/login')
  }

  return (
    <AppShell>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-muted mt-1">Manage your business profile and account.</p>
      </div>

      <div className="max-w-xl space-y-8">

        {/* ── Business Profile ── */}
        <div>
          {saved && (
            <div className="mb-5 px-5 py-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <span className="text-xl">✅</span>
              <p className="font-semibold text-success">Changes saved successfully.</p>
            </div>
          )}
          {serverError && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
              {serverError}
            </div>
          )}

          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-navy">Business profile</h2>
                <p className="text-muted text-sm">This is what customers and reports will show.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Input
                id="settings-name"
                label="Shop name"
                placeholder="e.g. Joy's Supermarket"
                value={form.name}
                onChange={set('name')}
                error={errors.name}
              />
              <PhoneNumberInput
                id="settings-phone"
                label="Business phone"
                countryId={form.phone_country_id}
                localNumber={form.phone_local_number}
                defaultCountryId={form.country_id}
                onChange={({ phone_country_id, phone_local_number }) => {
                  setForm(f => ({ ...f, phone_country_id, phone_local_number }))
                }}
                error={errors.phone}
                required={true}
              />
              <Input
                id="settings-location"
                label="Business location"
                placeholder="Street, City, Area"
                value={form.location}
                onChange={set('location')}
                left={<MapPin size={15} />}
              />

              {/* Currency — dynamic from GET /currencies */}
              <div className="form-group">
                <label htmlFor="settings-currency" className="label">Currency</label>
                {loadingLookup ? (
                  <div className="flex items-center gap-2 text-muted text-sm py-2">
                    <Loader2 size={14} className="animate-spin" /> Loading currencies…
                  </div>
                ) : (
                  <select
                    id="settings-currency"
                    className="input-field"
                    value={form.currency}
                    onChange={e => {
                      const iso    = e.target.value
                      const chosen = currencies.find(c => c.iso_code === iso)
                      setForm(f => ({ ...f, currency: iso, currency_id: chosen?.id ?? f.currency_id }))
                    }}
                  >
                    {currencies.map(c => (
                      <option key={c.iso_code} value={c.iso_code}>
                        {c.iso_code} — {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Country — optional, dynamic from GET /countries */}
              <div className="form-group">
                <label htmlFor="settings-country" className="label">
                  Country <span className="text-muted font-normal">(optional)</span>
                </label>
                {loadingLookup ? (
                  <div className="flex items-center gap-2 text-muted text-sm py-2">
                    <Loader2 size={14} className="animate-spin" /> Loading countries…
                  </div>
                ) : (
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <select
                      id="settings-country"
                      className="input-field pl-9"
                      value={form.country_id}
                      onChange={e => setForm(f => ({ ...f, country_id: e.target.value === '' ? '' : Number(e.target.value) }))}
                    >
                      <option value="">None selected</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Business type icon grid */}
              <div>
                <p className="label mb-3">Business type</p>
                <div className="grid grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, business_type: type.id }))}
                      className={[
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                        form.business_type === type.id
                          ? 'border-primary bg-blue-50'
                          : 'border-border bg-surface hover:border-primary hover:bg-blue-50',
                      ].join(' ')}
                    >
                      <span className="text-2xl">{type.emoji}</span>
                      <span className={`text-xs font-semibold text-center leading-tight ${form.business_type === type.id ? 'text-primary' : 'text-navy'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" loading={loading} className="gap-2">
                <Save size={16} />
                Save changes
              </Button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* ── Language ── */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Languages size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-navy">Language</h2>
              <p className="text-muted text-sm">Choose the language for this app.</p>
            </div>
          </div>
          <LanguageSwitcher variant="settings" />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* ── Account ── */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-bg-gray rounded-xl flex items-center justify-center">
              <User size={20} className="text-muted" />
            </div>
            <div>
              <h2 className="font-bold text-navy">Account</h2>
              <p className="text-muted text-sm">Your login details.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-bg-gray rounded-xl">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-navy">{user?.name || '—'}</p>
                <p className="text-muted text-sm">{user?.email}</p>
              </div>
            </div>

            <Button
              id="logout-btn"
              variant="secondary"
              onClick={handleLogout}
              loading={loggingOut}
              className="gap-2 border-danger text-danger hover:bg-red-50"
            >
              <LogOut size={16} />
              Log out
            </Button>
          </div>
        </div>

      </div>
    </AppShell>
  )
}

export default SettingsPage
