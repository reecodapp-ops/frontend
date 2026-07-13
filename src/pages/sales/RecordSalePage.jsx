import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, ShoppingCart, User, Plus, X, CheckCircle,
  Receipt, Trash2, ShieldAlert, ShieldCheck, Pencil, ArrowLeft, CalendarClock,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ReceiptView from '../../components/sales/ReceiptView'
import WarningBanner from '../../components/ui/WarningBanner'
import ReLoginModal from '../../components/shared/ReLoginModal'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { formatMoney } from '../../utils/format'

const uuidv4 = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// ─── Product search dropdown ──────────────────────────────────────────────────
const ProductSearch = ({ value, onChange, onSelect, currency, error, disabled }) => {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounce = useRef(null)
  const ref = useRef(null)

  useEffect(() => {
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = q => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return }
      setSearching(true)
      try {
        const res = await api.get('/products', { params: { search: q, limit: 20 } })
        setResults(res.data?.items || res.data || [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const handleChange = e => {
    setQuery(e.target.value)
    setOpen(true)
    search(e.target.value)
    onChange(null)
  }

  const handleSelect = p => {
    setQuery(p.name)
    setOpen(false)
    onSelect(p)
  }

  if (disabled) {
    return (
      <div className="input-field bg-bg-gray/80 text-navy text-sm border-border/50 font-semibold">
        {value?.name || '—'}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          className={`input-field pl-10 py-2.5 text-sm ${error ? 'error' : ''}`}
          placeholder="Search product…"
          value={query}
          onChange={handleChange}
          onFocus={() => { setOpen(true); if (!query) search('') }}
        />
      </div>
      {error && <p className="error-msg text-xs">{error}</p>}
      {open && (results.length > 0 || searching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-modal z-30 max-h-48 overflow-y-auto">
          {searching ? (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          ) : results.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-gray transition-colors border-b border-border last:border-0 text-left"
            >
              <div>
                <p className="font-semibold text-navy">{p.name}</p>
                {p.stock_on_hand != null && (
                  <p className="text-xs text-muted">{p.stock_on_hand} in stock</p>
                )}
              </div>
              <span className="text-muted text-xs">{formatMoney(p.selling_price, currency)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Customer search dropdown ─────────────────────────────────────────────────
const CustomerSearch = ({ value, onSelect, error }) => {
  const [query, setQuery] = useState(value?.full_name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounce = useRef(null)
  const ref = useRef(null)

  useEffect(() => { if (value) setQuery(value.full_name || '') }, [value])

  useEffect(() => {
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = q => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get('/customers', { params: { search: q, limit: 20 } })
        setResults(res.data?.items || res.data || [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          className={`input-field pl-10 py-2.5 text-sm ${error ? 'error' : ''}`}
          placeholder="Search customer… (optional for cash)"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); search(e.target.value); onSelect(null) }}
          onFocus={() => { setOpen(true); search(query) }}
        />
      </div>
      {error && <p className="error-msg text-xs">{error}</p>}
      {open && (results.length > 0 || searching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-modal z-30 max-h-48 overflow-y-auto">
          {searching ? (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          ) : results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setQuery(c.full_name); setOpen(false); onSelect(c) }}
              className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-bg-gray transition-colors border-b border-border last:border-0 text-left"
            >
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">{(c.full_name || 'C')[0].toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-navy">{c.full_name}</p>
                {c.phone_number && <p className="text-xs text-muted">{c.phone_number}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Live credit hint (bonus feature, ON_DEBT only) ───────────────────────────
const CreditHint = ({ customerId, amount }) => {
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const debounce = useRef(null)

  useEffect(() => {
    if (!customerId || !amount || amount <= 0) { setResult(null); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await api.post(`/customers/${customerId}/simulate-credit`, { requested_amount: amount })
        setResult(res.data)
      } catch { setResult(null) }
      finally { setChecking(false) }
    }, 400)
    return () => clearTimeout(debounce.current)
  }, [customerId, amount])

  if (checking) return <p className="text-xs text-muted mt-2">Checking credit standing…</p>
  if (!result) return null

  const approved = result.would_be_approved ?? true
  const message = result.recommendation

  return (
    <div className={`flex items-start gap-2 mt-2 px-3 py-2 rounded-xl text-xs ${approved ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
      {approved ? <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" /> : <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" />}
      <span>{message || (approved ? 'This debt sale looks safe to approve.' : 'This may exceed the recommended credit limit.')}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const emptyLine = () => ({ product: null, qty: '1', unit_price: '', _id: Math.random(), _itemId: null })

const RecordSalePage = () => {
  const { business } = useAuth()
  const currency = business?.currency || { iso_code: 'UGX', symbol: 'USh', decimal_places: 0 }

  const { id: saleId } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(saleId)

  const [paymentType, setPaymentType] = useState('CASH')
  const [customer, setCustomer] = useState(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCust, setNewCust] = useState({ full_name: '', phone_number: '' })
  const [savingCust, setSavingCust] = useState(false)

  const [lines, setLines] = useState([emptyLine()])
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [reason, setReason] = useState('')

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [createdSaleId, setCreatedSaleId] = useState(null)

  const [loadingSale, setLoadingSale] = useState(isEditMode)
  const [saleLoadError, setSaleLoadError] = useState('')
  const [editSaved, setEditSaved] = useState(false)
  const originalRef = useRef(null)

  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4)
  const [showReLogin, setShowReLogin] = useState(false)

  const triggerNewIdempotencyKey = () => setIdempotencyKey(uuidv4())

  useEffect(() => {
    if (!isEditMode) return
    let cancelled = false

    const loadSale = async () => {
      setLoadingSale(true)
      setSaleLoadError('')
      try {
        const res = await api.get(`/sales/${saleId}`)
        if (cancelled) return
        const sale = res.data

        const loadedLines = (sale.items || []).map(it => ({
          _id: Math.random(),
          _itemId: it.id,
          product: { id: it.product_id, name: it.product_name || it.product_name_snapshot },
          qty: String(it.quantity),
          unit_price: String(it.unit_price),
        }))

        setPaymentType(sale.payment_type || 'CASH')
        if (sale.customer_id) {
          let custInfo = { id: sale.customer_id, full_name: sale.customer_name || '', phone_number: sale.customer_phone || '' }
          if (!custInfo.full_name) {
            try {
              const custRes = await api.get(`/customers/${sale.customer_id}`)
              custInfo = { id: custInfo.id, full_name: custRes.data.full_name, phone_number: custRes.data.phone_number }
            } catch { custInfo.full_name = 'Customer' }
          }
          setCustomer(custInfo)
        }
        setLines(loadedLines.length ? loadedLines : [emptyLine()])
        setNote(sale.note || '')
        setDueDate(sale.due_date || '')
        setOccurredAt(sale.occurred_at ? sale.occurred_at.slice(0, 16) : '')

        originalRef.current = {
          note: sale.note || '',
          due_date: sale.due_date || '',
          items: loadedLines.map(l => ({ _itemId: l._itemId, qty: l.qty, unit_price: l.unit_price })),
        }
      } catch (err) {
        if (!cancelled) setSaleLoadError(err.response?.data?.detail || 'Could not load this sale.')
      } finally {
        if (!cancelled) setLoadingSale(false)
      }
    }

    loadSale()
    return () => { cancelled = true }
  }, [isEditMode, saleId])

  const updateLine = (id, field, value) => {
    setLines(prev => prev.map(l => l._id === id ? { ...l, [field]: value } : l))
    triggerNewIdempotencyKey()
  }
  const selectProduct = (id, product) => {
    setLines(prev => prev.map(l => l._id === id ? { ...l, product, unit_price: String(product.selling_price || '') } : l))
    triggerNewIdempotencyKey()
  }
  const removeLine = id => {
    setLines(prev => prev.filter(l => l._id !== id))
    triggerNewIdempotencyKey()
  }

  const grandTotal = lines.reduce((sum, l) => sum + (parseFloat(l.unit_price) || 0) * (parseInt(l.qty, 10) || 0), 0)

  const handleSaveCustomer = async () => {
    if (!newCust.full_name.trim()) return
    setSavingCust(true)
    try {
      const res = await api.post('/customers', { full_name: newCust.full_name.trim(), phone_number: newCust.phone_number.trim() || null })
      setCustomer(res.data)
      setShowAddCustomer(false)
      setNewCust({ full_name: '', phone_number: '' })
      triggerNewIdempotencyKey()
    } catch { /* ignore */ }
    finally { setSavingCust(false) }
  }

  const validate = () => {
    const e = {}
    if (lines.every(l => !l.product)) e.lines = 'Add at least one product.'
    if (lines.some(l => l.product && (!l.qty || parseInt(l.qty, 10) < 1))) e.qty = 'All quantities must be at least 1.'
    if (lines.some(l => l.product && (!l.unit_price || parseFloat(l.unit_price) <= 0))) e.price = 'All prices must be greater than 0.'
    if (paymentType === 'ON_DEBT' && !customer) e.customer = 'Please select or add a customer for this debt sale.'
    if (isEditMode && !reason.trim()) e.reason = 'Please explain why this sale is being corrected.'
    return e
  }

  const handleCreate = async () => {
    const payload = {
      payment_type: paymentType,
      customer_id: customer?.id || null,
      occurred_at: occurredAt || null,
      due_date: paymentType === 'ON_DEBT' ? (dueDate || null) : null,
      note: note || null,
      items: lines.filter(l => l.product).map(l => ({
        product_id: l.product.id,
        product_name: l.product.name,
        quantity: parseInt(l.qty, 10),
        unit_price: parseFloat(l.unit_price),
      })),
    }

    const createRes = await api.post('/sales', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
      skipAuthRedirect: true
    })
    
    const sale = createRes.data.sale
    const createWarnings = createRes.data.warnings || []
    setCreatedSaleId(sale.id)

    try {
      const receiptRes = await api.get(`/sales/${sale.id}/receipt`, { skipAuthRedirect: true })
      setReceipt({
        ...receiptRes.data,
        outstanding_amount: sale.outstanding_amount,
        total_amount: receiptRes.data.total_amount ?? sale.total_amount,
        receipt_number: receiptRes.data.receipt_number ?? sale.receipt_number,
        payment_type: paymentType,
        due_date: paymentType === 'ON_DEBT' ? (dueDate || null) : null,
        customer_name: customer?.full_name || null,
        customer_phone: customer?.phone_number || null,
        note: note || null,
        occurred_at: occurredAt || new Date().toISOString(),
        warnings: createWarnings,
      })
    } catch (err) {
      if (err.response?.status === 401) {
        throw err // bubble 401 to handle session expiration modal
      }
      // Receipt fetch failed right after successful sale - present warning but show saved order
      setReceipt({
        id: sale.id,
        receipt_number: sale.receipt_number,
        outstanding_amount: sale.outstanding_amount,
        total_amount: sale.total_amount,
        payment_type: paymentType,
        due_date: paymentType === 'ON_DEBT' ? (dueDate || null) : null,
        customer_name: customer?.full_name || null,
        customer_phone: customer?.phone_number || null,
        note: note || null,
        occurred_at: occurredAt || new Date().toISOString(),
        warnings: createWarnings,
        fetchFailed: true,
      })
    }
  }

  const handleEditSubmit = async () => {
    const original = originalRef.current
    const corrections = []

    if (note !== original.note) {
      corrections.push({ correction_type_code: 'SALE_EDIT', original_record_id: saleId, field_changed: 'note', old_value_text: original.note, new_value_text: note, reason })
    }
    if (dueDate !== original.due_date) {
      corrections.push({ correction_type_code: 'SALE_EDIT', original_record_id: saleId, field_changed: 'due_date', old_value_text: original.due_date, new_value_text: dueDate, reason })
    }
    for (const line of lines) {
      const before = original.items.find(it => it._itemId === line._itemId)
      if (!before) continue
      if (before.qty !== line.qty) {
        corrections.push({ correction_type_code: 'SALE_ITEM_EDIT', original_record_id: line._itemId, field_changed: 'quantity', old_value_text: before.qty, new_value_text: line.qty, reason })
      }
      if (before.unit_price !== line.unit_price) {
        corrections.push({ correction_type_code: 'SALE_ITEM_EDIT', original_record_id: line._itemId, field_changed: 'unit_price', old_value_text: before.unit_price, new_value_text: line.unit_price, reason })
      }
    }

    if (corrections.length === 0) { setEditSaved(true); return }
    for (const correction of corrections) {
      await api.post('/corrections', correction, { skipAuthRedirect: true })
    }
    setEditSaved(true)
  }

  const submitSale = async () => {
    setServerError('')
    setErrors({})
    setLoading(true)
    try {
      if (isEditMode) await handleEditSubmit()
      else await handleCreate()
    } catch (err) {
      if (err.response?.status === 401) {
        setShowReLogin(true)
      } else {
        setServerError(err.response?.data?.detail || 'Could not save the sale. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = e => {
    if (e) e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    submitSale()
  }

  const handleReset = () => {
    setReceipt(null)
    setCreatedSaleId(null)
    setPaymentType('CASH')
    setCustomer(null)
    setLines([emptyLine()])
    setNote('')
    setDueDate('')
    setOccurredAt('')
    setErrors({})
    setServerError('')
    triggerNewIdempotencyKey()
  }

  if (isEditMode && loadingSale) {
    return <AppShell><div className="flex items-center justify-center py-24 text-muted">Loading sale…</div></AppShell>
  }
  if (isEditMode && saleLoadError) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-24">
          <p className="error-msg mb-3">{saleLoadError}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </AppShell>
    )
  }
  if (isEditMode && editSaved) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-16 space-y-4">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle size={26} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-navy">Correction submitted</h2>
          <p className="text-muted text-sm">Your changes have been recorded as corrections on this sale.</p>
          <Button onClick={() => navigate('/sales')} className="mt-2">Back to sales</Button>
        </div>
      </AppShell>
    )
  }

  if (!isEditMode && receipt) {
    return (
      <AppShell>
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-navy">Sale recorded</h1>
          <p className="text-muted mt-1">Here is the receipt.</p>
        </div>
        <div className="max-w-2xl space-y-4">
          {receipt.fetchFailed && (
            <WarningBanner message="Sale saved — receipt couldn't load, view it from the Sales list" />
          )}
          {receipt.warnings?.includes('OVERSELL') && (
            <WarningBanner message="Sold more than what was in stock" />
          )}
          <ReceiptView
            receipt={receipt}
            currency={currency}
            onEdit={() => navigate(`/sales/${createdSaleId}/edit`)}
          />
          <Button onClick={handleReset} variant="secondary" fullWidth className="gap-2">
            <Receipt size={16} />
            Record another sale
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-7 flex items-center gap-3">
        {isEditMode && (
          <button onClick={() => navigate(-1)} className="text-muted hover:text-navy transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            {isEditMode ? <><Pencil size={20} className="text-primary" /> Edit sale</> : 'Record a sale'}
          </h1>
          <p className="text-muted mt-1">
            {isEditMode ? 'Changes are saved as corrections — the original record is preserved.' : 'Fill in what was sold and how it was paid.'}
          </p>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {serverError && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
            )}

            <div className="card p-4">
              <p className="label mb-3">Payment type</p>
              {isEditMode ? (
                <span className={`badge ${paymentType === 'CASH' ? 'badge-success' : 'badge-warning'}`}>
                  {paymentType === 'CASH' ? 'Cash sale' : 'On debt'} (locked)
                </span>
              ) : (
                <div className="flex rounded-xl border border-border overflow-hidden">
                  {[{ value: 'CASH', label: '💵 Cash' }, { value: 'ON_DEBT', label: '📋 On debt' }].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setPaymentType(opt.value); triggerNewIdempotencyKey(); }}
                      className={[
                        'flex-1 py-3 text-sm font-semibold transition-colors',
                        paymentType === opt.value
                          ? opt.value === 'CASH' ? 'bg-success text-white' : 'bg-warning text-white'
                          : 'bg-surface text-muted hover:bg-bg-gray',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4 space-y-3">
              <p className="label">
                Customer {paymentType === 'CASH' && <span className="text-muted font-normal">(optional — helps build their history)</span>}
              </p>
              {isEditMode ? (
                customer ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-xl">
                    <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{customer.full_name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 text-sm">{customer.full_name}</p>
                      {customer.phone_number && <p className="text-xs text-amber-700">{customer.phone_number}</p>}
                    </div>
                    <span className="text-xs text-amber-700">Locked</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No customer attached to this sale.</p>
                )
              ) : (
                <>
                  {!showAddCustomer ? (
                    <>
                      <CustomerSearch value={customer} onSelect={c => { setCustomer(c); triggerNewIdempotencyKey(); }} error={errors.customer} />
                      <button type="button" onClick={() => setShowAddCustomer(true)} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
                        <Plus size={14} /> Add new customer
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3 p-4 bg-bg-gray rounded-xl">
                      <p className="text-sm font-semibold text-navy flex items-center gap-2">
                        <User size={15} className="text-primary" /> New customer
                      </p>
                      <Input id="new-cust-name" placeholder="Customer name" value={newCust.full_name} onChange={e => setNewCust(c => ({ ...c, full_name: e.target.value }))} />
                      <Input id="new-cust-phone" placeholder="Phone (optional)" value={newCust.phone_number} onChange={e => setNewCust(c => ({ ...c, phone_number: e.target.value }))} />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowAddCustomer(false)} className="btn btn-secondary flex-1 py-2 text-xs font-semibold rounded-xl">Cancel</button>
                        <button type="button" loading={savingCust} onClick={handleSaveCustomer} className="btn btn-primary flex-1 py-2 text-xs font-semibold rounded-xl">Save customer</button>
                      </div>
                    </div>
                  )}
                  {customer && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-xl">
                      <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{customer.full_name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 text-sm">{customer.full_name}</p>
                        {customer.phone_number && <p className="text-xs text-amber-700">{customer.phone_number}</p>}
                      </div>
                      <button type="button" onClick={() => { setCustomer(null); triggerNewIdempotencyKey(); }} className="text-amber-600 hover:text-amber-900">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {paymentType === 'ON_DEBT' && <CreditHint customerId={customer?.id} amount={grandTotal} />}
                </>
              )}
            </div>

            {paymentType === 'ON_DEBT' && (
              <div className="card p-4">
                <p className="label mb-3 flex items-center gap-2">
                  <CalendarClock size={15} className="text-warning" />
                  When is this debt due? <span className="text-muted font-normal">(optional)</span>
                </p>
                <Input
                  id="sale-due-date"
                  type="date"
                  value={dueDate || ''}
                  onChange={e => { setDueDate(e.target.value); triggerNewIdempotencyKey(); }}
                />
                <p className="text-xs text-muted mt-2">
                  If you skip this, the customer is treated as overdue once the debt has been open for more than 30 days.
                </p>
              </div>
            )}

            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="label mb-0">Items sold</p>
                {errors.lines && <p className="text-danger text-xs">{errors.lines}</p>}
              </div>

              {lines.map((line, idx) => (
                <div key={line._id} className="p-4 bg-bg-gray rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide">Item {idx + 1}</p>
                    {!isEditMode && lines.length > 1 && (
                      <button type="button" onClick={() => handleRemoveLine(line._id)} className="text-muted hover:text-danger transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <ProductSearch
                    value={line.product}
                    onChange={() => updateLine(line._id, 'product', null)}
                    onSelect={p => selectProduct(line._id, p)}
                    currency={currency}
                    error={errors.lines && !line.product ? 'Select a product' : ''}
                    disabled={isEditMode}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input id={`qty-${line._id}`} label="Qty" type="number" min="1" placeholder="1" value={line.qty} onChange={e => updateLine(line._id, 'qty', e.target.value)} error={errors.qty && line.product && parseInt(line.qty) < 1 ? 'Min 1' : ''} />
                    <Input id={`price-${line._id}`} label="Unit price" type="number" placeholder="0" value={line.unit_price} onChange={e => updateLine(line._id, 'unit_price', e.target.value)} left={<span className="text-xs font-semibold">{currency?.symbol || currency?.iso_code}</span>} />
                    <div className="form-group">
                      <label className="label">Line total</label>
                      <div className="input-field bg-bg-gray/80 text-muted text-sm border-border/50">
                        {formatMoney((parseFloat(line.unit_price) || 0) * (parseInt(line.qty, 10) || 0), currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!isEditMode && (
                <button type="button" onClick={() => { setLines(prev => [...prev, emptyLine()]); triggerNewIdempotencyKey(); }} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                  <Plus size={15} /> Add another item
                </button>
              )}
              {isEditMode && (
                <p className="text-xs text-muted">Adding or removing items isn't supported through corrections — quantity and price on existing items can be adjusted above.</p>
              )}
            </div>

            <div className="card p-4 space-y-4">
              <div className="form-group">
                <label htmlFor="sale-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
                <textarea id="sale-note" className="input-field resize-none" rows={2} placeholder="e.g. Customer paid half now…" value={note} onChange={e => { setNote(e.target.value); triggerNewIdempotencyKey(); }} />
              </div>
              {!isEditMode && (
                <Input id="sale-occurred-at" label={<>Occurred at <span className="text-muted font-normal">(optional)</span></>} type="datetime-local" value={occurredAt} onChange={e => { setOccurredAt(e.target.value); triggerNewIdempotencyKey(); }} />
              )}
            </div>

            {isEditMode && (
              <div className="card p-4">
                <div className="form-group">
                  <label htmlFor="edit-reason" className="label">Reason for this change</label>
                  <textarea id="edit-reason" className={`input-field resize-none ${errors.reason ? 'error' : ''}`} rows={2} placeholder="e.g. Customer actually bought 3, not 2" value={reason} onChange={e => setReason(e.target.value)} />
                  {errors.reason && <p className="error-msg text-xs">{errors.reason}</p>}
                </div>
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg" className="gap-2">
              {isEditMode ? <><Pencil size={18} /> Save correction</> : <><ShoppingCart size={18} /> Record sale</>}
            </Button>
          </form>
        </div>

        <div className="w-80 flex-shrink-0 sticky top-8">
          <div className="card p-5">
            <p className="font-bold text-navy mb-4 flex items-center gap-2">
              <Receipt size={18} className="text-muted" /> Order summary
            </p>
            {lines.filter(l => l.product).length === 0 ? (
              <p className="text-muted text-sm text-center py-4">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {lines.filter(l => l.product).map((line, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{line.product.name}</p>
                      <p className="text-xs text-muted">{line.qty} × {formatMoney(line.unit_price, currency)}</p>
                    </div>
                    <p className="text-sm font-semibold text-navy flex-shrink-0">
                      {formatMoney((parseFloat(line.unit_price) || 0) * (parseInt(line.qty, 10) || 0), currency)}
                    </p>
                  </div>
                ))}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-navy">Total</p>
                    <p className="font-bold text-navy text-xl">{formatMoney(grandTotal, currency)}</p>
                  </div>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Payment</span>
                    <span className={`font-semibold ${paymentType === 'CASH' ? 'text-success' : 'text-warning'}`}>{paymentType === 'CASH' ? 'Cash' : 'On debt'}</span>
                  </div>
                  {customer && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Customer</span>
                      <span className="font-semibold text-navy">{customer.full_name}</span>
                    </div>
                  )}
                  {dueDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Due date</span>
                      <span className="font-semibold text-navy">{dueDate}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReLogin && (
        <ReLoginModal onSuccess={submitSale} />
      )}
    </AppShell>
  )
}

export default RecordSalePage
