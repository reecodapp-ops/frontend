import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Search, Phone, ChevronRight, X, Plus, Truck, Package, Gauge,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SlidePanel from '../../components/ui/SlidePanel'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import ScoreCard from '../../components/shared/ScoreCard'
import PhoneNumberInput from '../../components/ui/PhoneNumberInput'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { formatMoney, formatDate } from '../../utils/format'

const PAYMENT_FLEXIBILITY_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'SOMETIMES_FLEXIBLE', label: 'Sometimes flexible' },
  { value: 'STRICT_CASH', label: 'Strict cash only' },
]

const reliabilityVariant = color => {
  const map = {
    green: 'success',
    yellow: 'warning',
    orange: 'warning',
    red: 'danger',
  }
  return map[color] || 'neutral'
}

const AddSupplierPanel = ({ onClose, onSaved }) => {
  const { business } = useAuth()
  const defaultCountryId = business?.country_id

  const [form, setForm] = useState({
    name: '', phone_country_id: '', phone_local_number: '', credit_terms_days: '', payment_flexibility: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Supplier name is required.'
    return e
  }

  const handleSubmit = async ev => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setServerError('')
    try {
      const res = await api.post('/suppliers', {
        name: form.name.trim(),
        phone_country_id: form.phone_country_id ? Number(form.phone_country_id) : null,
        phone_local_number: form.phone_local_number ? form.phone_local_number.trim() : null,
        credit_terms_days: form.credit_terms_days ? parseInt(form.credit_terms_days, 10) : null,
        payment_flexibility: form.payment_flexibility || null,
      })
      onSaved(res.data)
      onClose()
    } catch (err) {
      if (err.response?.data?.code === 'invalid_phone_number' || err.response?.data?.detail?.toLowerCase().includes('phone')) {
        setErrors(prev => ({ ...prev, phone: err.response?.data?.detail || 'Invalid phone number.' }))
      } else {
        setServerError(err.response?.data?.detail || 'Could not save supplier.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlidePanel title="Add supplier" onClose={onClose} width="w-[420px]">
      <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
        {serverError && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
        )}
        <Input id="sup-name" label="Supplier name" placeholder="e.g. Kato Supplies" value={form.name} onChange={set('name')} error={errors.name} />
        
        <PhoneNumberInput
          id="sup-phone"
          label="Phone number"
          countryId={form.phone_country_id}
          localNumber={form.phone_local_number}
          defaultCountryId={defaultCountryId}
          onChange={({ phone_country_id, phone_local_number }) => {
            setForm(f => ({ ...f, phone_country_id, phone_local_number }))
          }}
          error={errors.phone}
          required={false}
        />

        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Terms <span className="font-normal">(optional — improves the Supplier Terms score)</span>
          </p>
          <div className="space-y-3">
            <Input
              id="sup-credit-days"
              label="Credit terms (days)"
              type="number"
              placeholder="e.g. 14"
              value={form.credit_terms_days}
              onChange={set('credit_terms_days')}
            />
            <div className="form-group">
              <label htmlFor="sup-flex" className="label">Payment flexibility</label>
              <select id="sup-flex" className="input-field" value={form.payment_flexibility} onChange={set('payment_flexibility')}>
                {PAYMENT_FLEXIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">Save supplier</Button>
        </div>
      </form>
    </SlidePanel>
  )
}

// ─── Supplier Detail Panel ────────────────────────────────────────────────────
const SupplierDetail = ({ supplier, currency, onClose }) => {
  const [scores, setScores] = useState(null)
  const [scoresLoading, setScoresLoading] = useState(true)
  const [scoresLens, setScoresLens] = useState('reliability')
  const [tab, setTab] = useState('scores')
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setScoresLoading(true)
      try {
        const res = await api.get(`/suppliers/${supplier.id}/scores`)
        if (!cancelled) setScores(res.data)
      } catch {
        if (!cancelled) setScores(null)
      } finally {
        if (!cancelled) setScoresLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [supplier.id])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await api.get('/stock-purchases', { params: { supplier_id: supplier.id, limit: 30, order: 'recent' } })
      setOrders(res.data?.items || [])
    } catch {
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [supplier.id])

  const handleTabClick = id => {
    setTab(id)
    if (id === 'orders' && orders.length === 0) loadOrders()
  }

  return (
    <div className="w-[460px] card p-0 overflow-hidden slide-in-right flex-shrink-0 flex flex-col max-h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-navy">{supplier.name}</p>
            <p className="text-muted text-xs flex items-center gap-1"><Phone size={11} /> {supplier.phone_number || 'No phone'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={18} /></button>
      </div>

      {/* Terms summary strip */}
      {(supplier.credit_terms_days != null || supplier.payment_flexibility) && (
        <div className="px-5 py-3 bg-bg-gray border-b border-border flex-shrink-0 flex items-center gap-4 text-xs">
          {supplier.credit_terms_days != null && (
            <span className="text-muted">Credit terms: <strong className="text-navy">{supplier.credit_terms_days} days</strong></span>
          )}
          {supplier.payment_flexibility && (
            <span className="text-muted">Flexibility: <strong className="text-navy">{supplier.payment_flexibility.replace(/_/g, ' ')}</strong></span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {[{ id: 'scores', label: 'Reecod scores' }, { id: 'orders', label: 'Recent orders' }].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabClick(t.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-navy'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'scores' ? (
          scoresLoading ? (
            <div>{[1, 2].map(i => <SkeletonRow key={i} cols={2} />)}</div>
          ) : !scores ? (
            <div className="text-center py-10">
              <Gauge size={28} className="text-border mx-auto mb-2" />
              <p className="text-muted text-sm">Could not load Reecod scores.</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              <div className="flex rounded-xl border border-border overflow-hidden">
                {[{ id: 'reliability', label: 'Reliability' }, { id: 'terms', label: 'Terms' }].map(l => (
                  <button
                    key={l.id}
                    onClick={() => setScoresLens(l.id)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${scoresLens === l.id ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-bg-gray'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <ScoreCard
                score={scores.scores?.[scoresLens]}
                insufficientHint={scoresLens === 'reliability' ? 'Needs 3 supplier orders to calculate.' : 'Needs more pricing or payment records.'}
              />
            </div>
          )
        ) : (
          ordersLoading ? (
            <div>{[1, 2, 3].map(i => <SkeletonRow key={i} cols={3} />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <Package size={28} className="text-border mx-auto mb-2" />
              <p className="text-muted text-sm">No stock purchases recorded from this supplier yet.</p>
            </div>
          ) : (
            <div>
              {orders.map(o => (
                <div key={o.id} className="px-5 py-4 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-navy">{formatMoney(o.total_buying_cost || o.total_item_cost, currency)}</p>
                    <p className="text-xs text-muted">{formatDate(o.occurred_at)}</p>
                  </div>
                  {(o.promised_delivery_date || o.actual_delivery_date) && (
                    <p className="text-xs text-muted">
                      {o.promised_delivery_date && `Promised ${formatDate(o.promised_delivery_date)}`}
                      {o.promised_delivery_date && o.actual_delivery_date && ' · '}
                      {o.actual_delivery_date && `Delivered ${formatDate(o.actual_delivery_date)}`}
                    </p>
                  )}
                  {o.items?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted">
                          <span>{it.product_name} × {it.quantity}</span>
                          <span>{formatMoney(it.unit_buying_cost, currency)} each</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const SuppliersPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || { iso_code: 'UGX', symbol: 'USh', decimal_places: 0 }

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState('recent')
  const [reliabilityLevel, setReliabilityLevel] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [banner, setBanner] = useState('')
  const searchDebounce = useRef(null)

  const loadSuppliers = useCallback(async (overrides = {}) => {
    setLoading(true)
    try {
      const params = { search: overrides.search ?? search, order: overrides.order ?? order, limit: 100 }
      
      const rLevel = overrides.hasOwnProperty('reliability_level')
        ? overrides.reliability_level
        : reliabilityLevel
      
      if (rLevel) {
        params.reliability_level = rLevel
      }
      
      const res = await api.get('/suppliers', { params })
      setSuppliers(res.data?.items || [])
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [search, order, reliabilityLevel])

  useEffect(() => { loadSuppliers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = e => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => loadSuppliers({ search: q }), 300)
  }

  const handleOrderChange = e => { setOrder(e.target.value); loadSuppliers({ order: e.target.value }) }

  const handleAddSaved = newSup => {
    setSuppliers(prev => [newSup, ...prev])
    setSelected(newSup)
    setBanner(`${newSup.name} added successfully.`)
  }

  const CHIPS = [
    { label: 'All', value: '', type: 'filter' },
    { label: 'Reliable', value: 'RELIABLE', type: 'filter' },
    { label: 'Fair', value: 'FAIR', type: 'filter' },
    { label: 'Unstable', value: 'UNSTABLE', type: 'filter' },
    { label: 'Avoid Urgent', value: 'AVOID_URGENT', type: 'filter' },
    { label: 'Best Terms', value: 'terms_desc', type: 'sort' }
  ]

  return (
    <AppShell>
      {banner && <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Suppliers</h1>
          <p className="text-muted mt-1">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} on file</p>
        </div>
        <Button onClick={() => setShowAddPanel(true)} className="gap-2">
          <Plus size={16} /> Add supplier
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" placeholder="Search suppliers…" className="input-field pl-10 py-2.5 text-sm w-full" value={search} onChange={handleSearch} />
        </div>
        <select className="input-field w-auto py-2 text-sm" value={order} onChange={handleOrderChange}>
          <option value="recent">Most recently added</option>
          <option value="name_asc">Name (A–Z)</option>
        </select>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CHIPS.map(c => {
          const isActive = c.type === 'sort'
            ? order === c.value
            : (reliabilityLevel === c.value && order !== 'terms_desc')

          return (
            <button
              key={c.label}
              onClick={() => {
                if (c.type === 'sort') {
                  const nextOrder = order === 'terms_desc' ? 'recent' : 'terms_desc'
                  setOrder(nextOrder)
                  loadSuppliers({ order: nextOrder })
                } else {
                  setReliabilityLevel(c.value)
                  let nextOrder = order
                  if (order === 'terms_desc') {
                    nextOrder = 'recent'
                    setOrder('recent')
                  }
                  loadSuppliers({ reliability_level: c.value, order: nextOrder })
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                isActive
                  ? 'bg-primary border-primary text-white shadow-sm'
                  : 'bg-surface border-border text-muted hover:text-navy hover:border-primary'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-6">
        <div className={`flex-1 card p-0 overflow-hidden transition-all duration-300 ${selected ? 'rounded-r-none' : ''}`}>
          <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-bg-gray border-b border-border">
            {['Name', 'Phone', 'Reliability', 'Terms'].map(h => (
              <p key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{h}</p>
            ))}
          </div>

          {loading ? (
            <div>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={4} />)}</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-16">
              <Truck size={36} className="text-border mx-auto mb-3" />
              <p className="font-semibold text-navy">No suppliers yet</p>
              <p className="text-muted text-sm mt-1">Add a supplier to start tracking stock purchases and reliability.</p>
            </div>
          ) : (
            <div>
              {suppliers.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full grid grid-cols-4 gap-4 px-6 py-4 border-b border-border last:border-0 text-left hover:bg-bg-gray transition-colors ${selected?.id === s.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{(s.name || 'S')[0].toUpperCase()}</span>
                    </div>
                    <p className="font-semibold text-navy text-sm truncate">{s.name}</p>
                  </div>
                  <p className="text-sm text-muted self-center">{s.phone_number || '—'}</p>
                  <div className="self-center">
                    <Badge variant={reliabilityVariant(s.reliability_color)}>
                      {s.reliability_label || 'Needs more records'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between min-w-0">
                    <span className="text-sm text-muted truncate">
                      {s.credit_terms_days != null ? `${s.credit_terms_days}-day terms` : 'No terms recorded'}
                    </span>
                    <ChevronRight size={16} className="text-border flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && <SupplierDetail supplier={selected} currency={currency} onClose={() => setSelected(null)} />}
      </div>

      {showAddPanel && <AddSupplierPanel onClose={() => setShowAddPanel(false)} onSaved={handleAddSaved} />}
    </AppShell>
  )
}

export default SuppliersPage
