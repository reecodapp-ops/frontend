import { useState, useEffect } from 'react'
import { MapPin, Store, Globe, Loader2 } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import PhoneNumberInput, { parseE164 } from '../../components/ui/PhoneNumberInput'
import api from '../../api/axios'

const BUSINESS_TYPES = [
  { id: 1, code: 'retail',    label: 'Retail shop',  sort_order: 1 },
  { id: 2, code: 'boutique',  label: 'Boutique',     sort_order: 2 },
  { id: 3, code: 'wholesale', label: 'Wholesale',    sort_order: 3 },
  { id: 4, code: 'pharmacy',  label: 'Pharmacy',     sort_order: 4 },
  { id: 5, code: 'hardware',  label: 'Hardware',     sort_order: 5 },
  { id: 6, code: 'other',     label: 'Other',        sort_order: 6 },
]

const Step2Business = ({ initialData, onBack, onSuccess }) => {
  const [form, setForm] = useState({
    name:               initialData?.name               || '',
    phone:              initialData?.phone              || '',
    phone_country_id:   initialData?.phone_country_id   || '',
    phone_local_number: initialData?.phone_local_number || '',
    location:           initialData?.location           || '',
    currency:           initialData?.currency           || '',
    currency_id:        initialData?.currency_id        || '',
    business_type:      initialData?.business_type      || '',
    country_id:         initialData?.country_id         || '',
  })
  const [errors, setErrors] = useState({})

  const [currencies, setCurrencies] = useState([])
  const [countries,  setCountries]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadOptions = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [currRes, countryRes] = await Promise.all([
          api.get('/currencies'),
          api.get('/countries'),
        ])

        if (cancelled) return

        const activeCurrencies = (currRes.data || [])
          .filter(c => c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)

        const activeCountries = (countryRes.data || [])
          .filter(c => c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)

        setCurrencies(activeCurrencies)
        setCountries(activeCountries)

        setForm(f => {
          let updated = { ...f }
          if (!updated.currency_id) {
            if (updated.currency) {
              const match = activeCurrencies.find(c => c.iso_code === updated.currency)
              if (match) updated.currency_id = match.id
            } else {
              const ugx = activeCurrencies.find(c => c.iso_code === 'UGX')
              const chosen = ugx || activeCurrencies[0]
              updated.currency = chosen?.iso_code || ''
              updated.currency_id = chosen?.id ?? ''
            }
          }

          // Parse existing phone if applicable
          if (updated.phone && !updated.phone_local_number) {
            const { countryId, localNumber } = parseE164(updated.phone, activeCountries)
            updated.phone_country_id = countryId || ''
            updated.phone_local_number = localNumber || ''
          }

          return updated
        })
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.detail || err.message || 'Could not load options.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOptions()
    return () => { cancelled = true }
  }, [])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleCountryChange = e => {
    const raw       = e.target.value
    const countryId = raw === '' ? '' : Number(raw)
    const country   = countries.find(c => c.id === countryId)

    setForm(f => {
      const next = { ...f, country_id: countryId, phone_country_id: countryId }

      if (country?.default_currency_id != null) {
        const defaultCurrency = currencies.find(c => c.id === country.default_currency_id)
        if (defaultCurrency) {
          next.currency    = defaultCurrency.iso_code
          next.currency_id = defaultCurrency.id
        }
      }

      return next
    })
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())                 e.name          = 'What is your shop called?'
    if (!form.phone_local_number?.trim())  e.phone         = 'Please add a business phone number.'
    if (!form.location.trim())             e.location      = 'Where is your shop located?'
    if (!form.business_type)               e.business_type = 'Please choose the type of business you run.'
    return e
  }

  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    onSuccess(form)
  }

  return (
    <div className="card shadow-modal">
      <div className="mb-7">
        <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Store size={22} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-navy">Tell us about your business</h2>
        <p className="text-muted mt-1.5">This helps Reecod set up your business clearly.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading setup options…</span>
        </div>
      ) : loadError ? (
        <div className="py-6 text-center">
          <p className="error-msg mb-3">{loadError}</p>
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            id="biz-name"
            label="Shop name"
            placeholder="e.g. Joy's Supermarket"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />

          <PhoneNumberInput
            id="biz-phone"
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
            id="biz-location"
            label="Business location"
            placeholder="Street, City, Area"
            value={form.location}
            onChange={set('location')}
            error={errors.location}
            left={<MapPin size={16} />}
          />

          {/* Country — optional; picking one suggests a currency */}
          <div className="form-group">
            <label htmlFor="biz-country" className="label">
              Country <span className="text-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <select
                id="biz-country"
                className="input-field pl-9"
                value={form.country_id}
                onChange={handleCountryChange}
              >
                <option value="">Select country…</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Currency — pre-filled from country but always editable */}
            <div className="form-group">
              <label htmlFor="biz-currency" className="label">Currency</label>
              <select
                id="biz-currency"
                className="input-field"
                value={form.currency}
                onChange={e => {
                  const iso    = e.target.value
                  const chosen = currencies.find(c => c.iso_code === iso)
                  setForm(f => ({ ...f, currency: iso, currency_id: chosen?.id ?? '' }))
                }}
              >
                {currencies.map(c => (
                  <option key={c.iso_code} value={c.iso_code}>
                    {c.iso_code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Business type — hardcoded list (no /business-types endpoint) */}
            <div className="form-group">
              <label htmlFor="biz-type-select" className="label">Business type</label>
              <select
                id="biz-type-select"
                className={`input-field ${errors.business_type ? 'error' : ''}`}
                value={form.business_type}
                onChange={set('business_type')}
              >
                <option value="">Select…</option>
                {BUSINESS_TYPES.map(t => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
              {errors.business_type && <p className="error-msg">{errors.business_type}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {onBack && (
              <Button type="button" variant="secondary" onClick={onBack} className="flex-1">
                Back
              </Button>
            )}
            <Button type="submit" className="flex-1" size="lg">
              Continue
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Step2Business
