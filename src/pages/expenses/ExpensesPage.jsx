import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Receipt, ShoppingBag, Zap, Home, Car, Users,
  Wrench, Wifi, FileText, Coffee, MoreHorizontal, X,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import DateGroupedList from '../../components/ui/DateGroupedList'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import WarningBanner from '../../components/ui/WarningBanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const today = () => new Date().toISOString().split('T')[0]

// Map category names to Lucide icons
const CATEGORY_ICONS = {
  rent: Home,
  electricity: Zap,
  water: Zap,
  transport: Car,
  salary: Users,
  salaries: Users,
  wages: Users,
  maintenance: Wrench,
  repair: Wrench,
  internet: Wifi,
  airtime: Wifi,
  food: Coffee,
  supplies: ShoppingBag,
  stock: ShoppingBag,
  default: FileText,
}

const getCategoryIcon = (name = '') => {
  const key = name.toLowerCase()
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon
  }
  return CATEGORY_ICONS.default
}

// ─── Record Expense Modal ────────────────────────────────────────────────────
const RecordExpenseModal = ({ categories, currency, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    note: '',
    date: today(),
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [unusualWarning, setUnusualWarning] = useState(false)
  const [pendingData, setPendingData] = useState(null)

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.category_id) e.category_id = 'Please select a category.'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = 'Amount must be greater than 0.'
    return e
  }

  const submit = async (payload, force = false) => {
    setLoading(true)
    setServerError('')
    try {
      const res = await api.post('/expenses', { ...payload, force })
      const warnings = res.data?.warnings || []
      if (!force && warnings.includes('UNUSUAL_AMOUNT')) {
        setPendingData(payload)
        setUnusualWarning(true)
        setLoading(false)
        return
      }
      onSuccess()
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Could not save expense.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    const payload = {
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      note: form.note || null,
      date: form.date,
    }
    await submit(payload)
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-bold text-navy">Record expense</h2>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
              {serverError}
            </div>
          )}

          {unusualWarning && (
            <WarningBanner
              message="This amount is higher than usual for this category. Do you want to continue?"
              onCancel={() => { setUnusualWarning(false); setPendingData(null) }}
              onConfirm={() => {
                setUnusualWarning(false)
                submit(pendingData, true)
              }}
            />
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Category */}
            <div className="form-group">
              <label htmlFor="exp-category" className="label">Category</label>
              <select
                id="exp-category"
                className={`input-field ${errors.category_id ? 'error' : ''}`}
                value={form.category_id}
                onChange={set('category_id')}
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category_id && <p className="error-msg">{errors.category_id}</p>}
            </div>

            {/* Amount */}
            <Input
              id="exp-amount"
              label="Amount"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={set('amount')}
              error={errors.amount}
              left={<span className="text-sm font-semibold">{currency}</span>}
            />

            {/* Note */}
            <div className="form-group">
              <label htmlFor="exp-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
              <textarea
                id="exp-note"
                className="input-field resize-none"
                rows={2}
                placeholder="What was this for?"
                value={form.note}
                onChange={set('note')}
              />
            </div>

            {/* Date */}
            <Input
              id="exp-date"
              label="Date"
              type="date"
              value={form.date}
              onChange={set('date')}
            />

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Save expense
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Expense Row ─────────────────────────────────────────────────────────────
const ExpenseRow = ({ item, currency }) => {
  const Icon = getCategoryIcon(item.category?.name || '')
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-bg-gray transition-colors">
      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-danger" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-navy text-sm truncate">
          {item.note || item.category?.name || 'Expense'}
        </p>
        <p className="text-muted text-xs mt-0.5">{item.category?.name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-danger text-sm">−{fmt(item.amount, currency)}</p>
        <p className="text-muted text-xs mt-0.5">
          {new Date(item.date || item.created_at).toLocaleTimeString('en-UG', {
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ExpensesPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'

  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [banner, setBanner] = useState('')

  // Filters
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/expense-categories')
      setCategories(res.data?.items || res.data || [])
    } catch {
      setCategories([])
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const params = {}
      if (filterCategory) params.category_id = filterCategory
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo
      const res = await api.get('/expenses', { params })
      setExpenses(res.data?.items || res.data || [])
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [business?.id, filterCategory, filterFrom, filterTo])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadExpenses() }, [loadExpenses])

  const clearFilters = () => {
    setFilterCategory('')
    setFilterFrom('')
    setFilterTo('')
  }

  const hasFilters = filterCategory || filterFrom || filterTo

  const handleSuccess = () => {
    loadExpenses()
    setBanner('Expense recorded successfully.')
  }

  return (
    <AppShell>
      {banner && (
        <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-navy">Expenses</h1>
        <Button id="record-expense-btn" onClick={() => setShowModal(true)} className="gap-2">
          <Plus size={16} />
          Record expense
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          id="expense-filter-category"
          className="input-field w-auto min-w-[160px] py-2.5 text-sm"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            id="expense-filter-from"
            type="date"
            className="input-field w-auto py-2.5 text-sm"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
          />
          <span className="text-muted text-sm">to</span>
          <input
            id="expense-filter-to"
            type="date"
            className="input-field w-auto py-2.5 text-sm"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-0 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={3} />)}
        </div>
      ) : (
        <DateGroupedList
          items={expenses}
          dateKey="date"
          renderItem={item => <ExpenseRow item={item} currency={currency} />}
          emptyState={
            <div className="card">
              <EmptyState
                icon={Receipt}
                iconBg="bg-red-50"
                iconColor="text-danger"
                heading="No expenses recorded yet"
                subtext="Start recording what you spend to run your business."
                action={{ label: 'Record expense', onClick: () => setShowModal(true) }}
              />
            </div>
          }
        />
      )}

      {showModal && (
        <RecordExpenseModal
          categories={categories}
          currency={currency}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </AppShell>
  )
}

export default ExpensesPage
