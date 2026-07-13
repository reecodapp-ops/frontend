import { useEffect, useState, useCallback } from 'react'
import { Plus, Minus, Banknote, TrendingUp, TrendingDown, X } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import DateGroupedList from '../../components/ui/DateGroupedList'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const today = () => new Date().toISOString().split('T')[0]

// ─── Add Money In Modal ───────────────────────────────────────────────────────
const MoneyInModal = ({ sourceTypes, currency, onClose, onSuccess }) => {
  const [form, setForm] = useState({ source_type_id: '', amount: '', note: '', date: today() })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  // Filter out OPENING_BALANCE
  const filteredTypes = sourceTypes.filter(t =>
    !['OPENING_BALANCE', 'opening_balance'].includes(t.code || t.id || t.name?.toUpperCase?.().replace(/\s/g, '_'))
  )

  const validate = () => {
    const e = {}
    if (!form.source_type_id) e.source_type_id = 'Please select a source type.'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await api.post('/capital-transactions', {
        type: 'MONEY_IN',
        source_type_id: form.source_type_id,
        amount: parseFloat(form.amount),
        note: form.note || null,
        date: form.date,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Could not save transaction.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-success" />
            </div>
            <h2 className="text-lg font-bold text-navy">Add money in</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="form-group">
              <label htmlFor="capital-in-source" className="label">Source type</label>
              <select
                id="capital-in-source"
                className={`input-field ${errors.source_type_id ? 'error' : ''}`}
                value={form.source_type_id}
                onChange={set('source_type_id')}
              >
                <option value="">Select source…</option>
                {filteredTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name || t.label}</option>
                ))}
              </select>
              {errors.source_type_id && <p className="error-msg">{errors.source_type_id}</p>}
            </div>

            <Input
              id="capital-in-amount"
              label="Amount"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={set('amount')}
              error={errors.amount}
              left={<span className="text-sm font-semibold">{currency}</span>}
            />

            <div className="form-group">
              <label htmlFor="capital-in-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
              <textarea id="capital-in-note" className="input-field resize-none" rows={2} placeholder="What is this money for?" value={form.note} onChange={set('note')} />
            </div>

            <Input id="capital-in-date" label="Date" type="date" value={form.date} onChange={set('date')} />

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" variant="success" loading={loading} className="flex-1">Save</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Remove Money Out Modal ────────────────────────────────────────────────────
const MoneyOutModal = ({ currency, onClose, onSuccess }) => {
  const [outType, setOutType] = useState('MONEY_OUT')
  const [form, setForm] = useState({ amount: '', note: '', date: today() })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Amount must be greater than 0.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await api.post('/capital-transactions', {
        type: outType,
        amount: parseFloat(form.amount),
        note: form.note || null,
        date: form.date,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Could not save transaction.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown size={18} className="text-danger" />
            </div>
            <h2 className="text-lg font-bold text-navy">Remove money out</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
          )}

          {/* Type toggle */}
          <div>
            <p className="label mb-2">Type</p>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {[
                { value: 'MONEY_OUT', label: 'Business expense' },
                { value: 'PERSONAL_USE', label: 'Personal use' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutType(opt.value)}
                  className={[
                    'flex-1 py-2.5 text-sm font-semibold transition-colors',
                    outType === opt.value
                      ? 'bg-danger text-white'
                      : 'bg-surface text-muted hover:bg-bg-gray',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              id="capital-out-amount"
              label="Amount"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={set('amount')}
              error={errors.amount}
              left={<span className="text-sm font-semibold">{currency}</span>}
            />

            <div className="form-group">
              <label htmlFor="capital-out-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
              <textarea id="capital-out-note" className="input-field resize-none" rows={2} placeholder="What is this for?" value={form.note} onChange={set('note')} />
            </div>

            <Input id="capital-out-date" label="Date" type="date" value={form.date} onChange={set('date')} />

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" variant="danger" loading={loading} className="flex-1">Save</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
const CapitalRow = ({ item, currency }) => {
  const isIn = item.type === 'MONEY_IN'
  const label = isIn
    ? (item.source_type?.name || item.source_type_label || 'Money in')
    : (item.type === 'PERSONAL_USE' ? 'Personal use' : 'Money out')

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-bg-gray transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-green-50' : 'bg-red-50'}`}>
        {isIn
          ? <TrendingUp size={17} className="text-success" />
          : <TrendingDown size={17} className="text-danger" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-navy text-sm">{label}</p>
        {item.note && <p className="text-muted text-xs mt-0.5 truncate">{item.note}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-sm ${isIn ? 'text-success' : 'text-danger'}`}>
          {isIn ? '+' : '−'}{fmt(item.amount, currency)}
        </p>
        <p className="text-muted text-xs mt-0.5">
          {new Date(item.date || item.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CapitalPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'

  const [transactions, setTransactions] = useState([])
  const [sourceTypes, setSourceTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMoneyIn, setShowMoneyIn] = useState(false)
  const [showMoneyOut, setShowMoneyOut] = useState(false)
  const [banner, setBanner] = useState('')

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const loadSourceTypes = useCallback(async () => {
    try {
      const res = await api.get('/capital-source-types')
      setSourceTypes(res.data?.items || res.data || [])
    } catch { setSourceTypes([]) }
  }, [])

  const loadTransactions = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const params = {}
      if (filterType) params.type = filterType
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo
      const res = await api.get('/capital-transactions', { params })
      setTransactions(res.data?.items || res.data || [])
    } catch { setTransactions([]) }
    finally { setLoading(false) }
  }, [business?.id, filterType, filterFrom, filterTo])

  useEffect(() => { loadSourceTypes() }, [loadSourceTypes])
  useEffect(() => { loadTransactions() }, [loadTransactions])

  const clearFilters = () => { setFilterType(''); setFilterFrom(''); setFilterTo('') }
  const hasFilters = filterType || filterFrom || filterTo

  const handleSuccess = () => {
    loadTransactions()
    setBanner('Transaction saved successfully.')
  }

  return (
    <AppShell>
      {banner && <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-navy">Money in / out</h1>
        <div className="flex items-center gap-3">
          <Button id="add-money-in-btn" variant="success" onClick={() => setShowMoneyIn(true)} className="gap-2">
            <Plus size={16} />
            Add money in
          </Button>
          <Button id="remove-money-out-btn" variant="danger" onClick={() => setShowMoneyOut(true)} className="gap-2">
            <Minus size={16} />
            Remove money out
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          id="capital-filter-type"
          className="input-field w-auto min-w-[160px] py-2.5 text-sm"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="MONEY_IN">Money in</option>
          <option value="MONEY_OUT">Money out</option>
          <option value="PERSONAL_USE">Personal use</option>
        </select>
        <div className="flex items-center gap-2">
          <input id="capital-filter-from" type="date" className="input-field w-auto py-2.5 text-sm" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          <span className="text-muted text-sm">to</span>
          <input id="capital-filter-to" type="date" className="input-field w-auto py-2.5 text-sm" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-primary hover:underline font-medium">Clear filters</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-0 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={3} />)}
        </div>
      ) : (
        <DateGroupedList
          items={transactions}
          dateKey="date"
          renderItem={item => <CapitalRow item={item} currency={currency} />}
          emptyState={
            <div className="card">
              <EmptyState
                icon={Banknote}
                iconBg="bg-green-50"
                iconColor="text-success"
                heading="No transactions recorded yet"
                subtext="Track money you add to or take from the business."
                action={{ label: 'Add money in', onClick: () => setShowMoneyIn(true) }}
              />
            </div>
          }
        />
      )}

      {showMoneyIn && (
        <MoneyInModal
          sourceTypes={sourceTypes}
          currency={currency}
          onClose={() => setShowMoneyIn(false)}
          onSuccess={handleSuccess}
        />
      )}
      {showMoneyOut && (
        <MoneyOutModal
          currency={currency}
          onClose={() => setShowMoneyOut(false)}
          onSuccess={handleSuccess}
        />
      )}
    </AppShell>
  )
}

export default CapitalPage
