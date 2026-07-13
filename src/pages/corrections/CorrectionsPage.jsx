import { useEffect, useState, useCallback } from 'react'
import {
  Pencil, ShoppingCart, Receipt, CreditCard, Banknote,
  ChevronRight, ArrowRight, AlertTriangle, CheckCircle2,
  Clock,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SlidePanel from '../../components/ui/SlidePanel'
import DateGroupedList from '../../components/ui/DateGroupedList'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const today = () => new Date().toISOString().split('T')[0]

// ─── Entity types ─────────────────────────────────────────────────────────────
const ENTITY_TYPES = [
  { id: 'sale', label: 'Sale', icon: ShoppingCart, color: 'text-primary', bg: 'bg-blue-50', endpoint: '/sales', filterParam: { type: 'cash' } },
  { id: 'expense', label: 'Expense', icon: Receipt, color: 'text-danger', bg: 'bg-red-50', endpoint: '/expenses', filterParam: {} },
  { id: 'payment', label: 'Payment', icon: CreditCard, color: 'text-success', bg: 'bg-green-50', endpoint: '/customer-payments', filterParam: {} },
  { id: 'capital', label: 'Capital entry', icon: Banknote, color: 'text-warning', bg: 'bg-amber-50', endpoint: '/capital-transactions', filterParam: {} },
]

// Step indicator
const StepIndicator = ({ current, total = 4 }) => (
  <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-bg-gray">
    {Array.from({ length: total }).map((_, i) => {
      const n = i + 1
      const done = n < current
      const active = n === current
      return (
        <div key={n} className="flex items-center gap-2">
          <div className={[
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
            done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-border text-muted',
          ].join(' ')}>
            {done ? <CheckCircle2 size={14} /> : n}
          </div>
          {n < total && <div className={`h-0.5 w-8 ${done ? 'bg-success' : 'bg-border'} transition-colors`} />}
        </div>
      )
    })}
    <p className="ml-2 text-xs text-muted font-medium">Step {current} of {total}</p>
  </div>
)

// ─── Record Selection List ────────────────────────────────────────────────────
const RecordList = ({ entity, selected, onSelect }) => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get(entity.endpoint, { params: { ...entity.filterParam, limit: 50 } })
        setRecords(res.data?.items || res.data || [])
      } catch { setRecords([]) }
      finally { setLoading(false) }
    }
    load()
  }, [entity])

  const getLabel = r => {
    if (entity.id === 'sale') return r.product_name || r.description || `Sale — ${fmt(r.amount, currency)}`
    if (entity.id === 'expense') return r.note || r.category?.name || `Expense — ${fmt(r.amount, currency)}`
    if (entity.id === 'payment') return `Payment from ${r.customer?.name || r.customer_name || 'customer'}`
    return r.note || `${r.type || 'Transaction'} — ${fmt(r.amount, currency)}`
  }

  if (loading) return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={3} />)}
    </div>
  )

  if (records.length === 0) return (
    <p className="text-muted text-sm text-center py-8">No records found.</p>
  )

  return (
    <div className="space-y-2">
      {records.map(r => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className={[
            'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150',
            selected?.id === r.id
              ? 'border-primary bg-blue-50'
              : 'border-border bg-surface hover:border-primary hover:bg-blue-50/50',
          ].join(' ')}
        >
          <div className={`w-9 h-9 ${entity.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <entity.icon size={16} className={entity.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm truncate">{getLabel(r)}</p>
            <p className="text-muted text-xs mt-0.5 flex items-center gap-1">
              <Clock size={10} />
              {new Date(r.date || r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <p className="font-bold text-sm text-navy flex-shrink-0">{fmt(r.amount, currency)}</p>
          {selected?.id === r.id && <ChevronRight size={16} className="text-primary flex-shrink-0" />}
        </button>
      ))}
    </div>
  )
}

// ─── Correction Form (Step 3) ─────────────────────────────────────────────────
const CorrectionForm = ({ entity, record, formData, setFormData, categories, currency }) => {
  const set = field => e => setFormData(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="space-y-4">
      {entity.id === 'expense' && (
        <div className="form-group">
          <label htmlFor="corr-category" className="label">Category</label>
          <select id="corr-category" className="input-field" value={formData.category_id || ''} onChange={set('category_id')}>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <Input
        id="corr-amount"
        label="Amount"
        type="number"
        value={formData.amount || ''}
        onChange={set('amount')}
        left={<span className="text-sm font-semibold">{currency}</span>}
      />

      <div className="form-group">
        <label htmlFor="corr-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
        <textarea id="corr-note" className="input-field resize-none" rows={2} value={formData.note || ''} onChange={set('note')} />
      </div>

      <Input id="corr-date" label="Date" type="date" value={formData.date || ''} onChange={set('date')} />

      <div className="form-group">
        <label htmlFor="corr-reason" className="label">Reason for correction <span className="text-danger">*</span></label>
        <textarea
          id="corr-reason"
          className={`input-field resize-none ${!formData.reason && formData._touched ? 'error' : ''}`}
          rows={2}
          placeholder="Describe why you are making this correction…"
          value={formData.reason || ''}
          onChange={set('reason')}
          onBlur={() => setFormData(f => ({ ...f, _touched: true }))}
        />
        {!formData.reason && formData._touched && (
          <p className="error-msg">Reason is required.</p>
        )}
      </div>

      {/* Live diff summary */}
      {record && formData.amount && parseFloat(formData.amount) !== parseFloat(record.amount) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-bg-gray rounded-xl text-sm">
          <ArrowRight size={14} className="text-muted flex-shrink-0" />
          <p className="text-muted">
            Changing amount from{' '}
            <span className="font-semibold text-navy">{fmt(record.amount, currency)}</span>
            {' '}to{' '}
            <span className="font-semibold text-primary">{fmt(formData.amount, currency)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Record Correction Panel ──────────────────────────────────────────────────
const RecordCorrectionPanel = ({ onClose, onSuccess, currency }) => {
  const [step, setStep] = useState(1)
  const [entityType, setEntityType] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [formData, setFormData] = useState({})
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  // Load categories for expense corrections
  useEffect(() => {
    api.get('/expense-categories').then(r => setCategories(r.data?.items || r.data || [])).catch(() => {})
  }, [])

  const handleSelectRecord = rec => {
    setSelectedRecord(rec)
    // Pre-fill form with current values
    setFormData({
      amount: rec.amount?.toString() || '',
      note: rec.note || '',
      date: (rec.date || rec.created_at || today()).split('T')[0],
      category_id: rec.category_id || rec.category?.id || '',
      reason: '',
      _touched: false,
    })
  }

  const buildDiff = () => {
    const diffs = []
    if (selectedRecord && formData.amount && parseFloat(formData.amount) !== parseFloat(selectedRecord.amount)) {
      diffs.push({ field: 'Amount', from: fmt(selectedRecord.amount, currency), to: fmt(formData.amount, currency) })
    }
    if (selectedRecord && formData.note !== (selectedRecord.note || '')) {
      diffs.push({ field: 'Note', from: selectedRecord.note || '—', to: formData.note || '—' })
    }
    if (selectedRecord && formData.date !== (selectedRecord.date || selectedRecord.created_at || '').split('T')[0]) {
      diffs.push({ field: 'Date', from: (selectedRecord.date || selectedRecord.created_at || '').split('T')[0], to: formData.date })
    }
    return diffs
  }

  const handleSubmit = async () => {
    if (!formData.reason?.trim()) {
      setFormData(f => ({ ...f, _touched: true }))
      return
    }
    setLoading(true)
    setServerError('')
    try {
      await api.post('/corrections', {
        entity_type: entityType.id,
        entity_id: selectedRecord.id,
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        _touched: undefined,
      })
      onSuccess(formData.amount, selectedRecord.amount)
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Could not save correction.')
    } finally {
      setLoading(false)
    }
  }

  const diffs = step === 4 ? buildDiff() : []

  return (
    <SlidePanel title="Record correction" onClose={onClose} width="w-[600px]">
      <StepIndicator current={step} total={4} />

      <div className="px-6 py-6">
        {/* Step 1 — Select entity type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-navy mb-1">What do you want to correct?</h3>
              <p className="text-muted text-sm">Select the type of record to fix.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ENTITY_TYPES.map(et => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => { setEntityType(et); setStep(2) }}
                  className={[
                    'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-150',
                    entityType?.id === et.id
                      ? 'border-primary bg-blue-50'
                      : 'border-border bg-surface hover:border-primary hover:bg-blue-50/50',
                  ].join(' ')}
                >
                  <div className={`w-12 h-12 ${et.bg} rounded-xl flex items-center justify-center`}>
                    <et.icon size={22} className={et.color} />
                  </div>
                  <span className="font-semibold text-navy text-sm">{et.label}</span>
                </button>
              ))}
            </div>
            <p className="text-muted text-xs text-center mt-2">
              Debt sales cannot be corrected here. Contact support.
            </p>
          </div>
        )}

        {/* Step 2 — Find the record */}
        {step === 2 && entityType && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => setStep(1)} className="text-muted hover:text-navy text-sm">← Back</button>
              <div>
                <h3 className="font-bold text-navy">Find the {entityType.label.toLowerCase()}</h3>
                <p className="text-muted text-sm">Select the record you want to correct.</p>
              </div>
            </div>
            <RecordList entity={entityType} selected={selectedRecord} onSelect={handleSelectRecord} />
            {selectedRecord && (
              <div className="mt-4">
                <div className="p-4 bg-blue-50 border border-primary/20 rounded-xl">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Selected record</p>
                  <p className="font-semibold text-navy text-sm">{fmt(selectedRecord.amount, currency)}</p>
                  <p className="text-muted text-xs">{(selectedRecord.date || selectedRecord.created_at || '').split('T')[0]}</p>
                </div>
                <Button onClick={() => setStep(3)} className="w-full mt-3">
                  Continue to edit <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Enter the correction */}
        {step === 3 && entityType && selectedRecord && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => setStep(2)} className="text-muted hover:text-navy text-sm">← Back</button>
              <div>
                <h3 className="font-bold text-navy">Enter the correction</h3>
                <p className="text-muted text-sm">Change the fields that were wrong.</p>
              </div>
            </div>
            <CorrectionForm
              entity={entityType}
              record={selectedRecord}
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              currency={currency}
            />
            <Button
              onClick={() => {
                setFormData(f => ({ ...f, _touched: true }))
                if (!formData.reason?.trim()) return
                setStep(4)
              }}
              className="w-full mt-2"
            >
              Review correction <ChevronRight size={16} />
            </Button>
          </div>
        )}

        {/* Step 4 — Confirm */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => setStep(3)} className="text-muted hover:text-navy text-sm">← Go back</button>
              <div>
                <h3 className="font-bold text-navy">Confirm correction</h3>
                <p className="text-muted text-sm">Review all changes before saving.</p>
              </div>
            </div>

            {/* Diff display */}
            {diffs.length > 0 ? (
              <div className="space-y-2">
                {diffs.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-bg-gray rounded-xl">
                    <p className="text-xs font-semibold text-muted w-16 flex-shrink-0">{d.field}</p>
                    <p className="text-sm text-navy line-through text-muted">{d.from}</p>
                    <ArrowRight size={14} className="text-muted flex-shrink-0" />
                    <p className="text-sm font-semibold text-primary">{d.to}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-bg-gray rounded-xl">
                <p className="text-muted text-sm text-center">No field changes detected.</p>
              </div>
            )}

            {/* Reason */}
            <div className="p-3 bg-bg-gray rounded-xl">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm text-navy">{formData.reason}</p>
            </div>

            {/* Warning box */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">This will recalculate your business cash balance.</p>
                <p className="text-amber-800 text-xs mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            {serverError && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(3)} className="flex-1">Go back</Button>
              <Button type="button" onClick={handleSubmit} loading={loading} className="flex-1">Confirm correction</Button>
            </div>
          </div>
        )}
      </div>
    </SlidePanel>
  )
}

// ─── Correction Row ───────────────────────────────────────────────────────────
const CorrectionRow = ({ item, currency }) => {
  const entityLabel = {
    sale: 'Sale', expense: 'Expense', payment: 'Payment', capital: 'Capital',
  }[item.entity_type] || item.entity_type

  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-bg-gray transition-colors">
      <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <Pencil size={15} className="text-purple" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-neutral text-xs">{entityLabel}</span>
          {item.field_changed && (
            <span className="text-xs text-muted">{item.field_changed} changed</span>
          )}
        </div>
        {/* Old → new */}
        {item.old_value != null && item.new_value != null && (
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="text-muted line-through">{item.old_value}</span>
            <ArrowRight size={13} className="text-muted flex-shrink-0" />
            <span className="font-semibold text-navy">{item.new_value}</span>
          </div>
        )}
        {item.reason && (
          <p className="text-muted text-xs truncate">Reason: {item.reason}</p>
        )}
      </div>
      <p className="text-muted text-xs flex-shrink-0 mt-1">
        {new Date(item.created_at || item.date).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CorrectionsPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'

  const [corrections, setCorrections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [banner, setBanner] = useState('')

  const loadCorrections = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const res = await api.get('/corrections')
      setCorrections(res.data?.items || res.data || [])
    } catch { setCorrections([]) }
    finally { setLoading(false) }
  }, [business?.id])

  useEffect(() => { loadCorrections() }, [loadCorrections])

  const handleSuccess = (newAmount, oldAmount) => {
    loadCorrections()
    const diff = parseFloat(newAmount) - parseFloat(oldAmount)
    setBanner(`Correction saved. Cash balance adjusted by ${diff >= 0 ? '+' : ''}${fmt(diff, currency)}.`)
  }

  return (
    <AppShell>
      {banner && <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />}

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-navy">Corrections</h1>
          <p className="text-muted mt-1 text-sm">Fix a mistake on a past sale, expense, payment, or capital entry.</p>
        </div>
        <Button id="record-correction-btn" onClick={() => setShowPanel(true)} className="gap-2">
          <Pencil size={15} />
          Record correction
        </Button>
      </div>

      <div className="mb-6" />

      {loading ? (
        <div className="card p-0 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={4} />)}
        </div>
      ) : (
        <DateGroupedList
          items={corrections}
          dateKey="created_at"
          renderItem={item => <CorrectionRow item={item} currency={currency} />}
          emptyState={
            <div className="card">
              <EmptyState
                icon={Pencil}
                iconBg="bg-purple-50"
                iconColor="text-purple"
                heading="No corrections recorded yet"
                subtext="Use this section to fix mistakes in past sales, expenses, payments, or capital entries."
              />
            </div>
          }
        />
      )}

      {showPanel && (
        <RecordCorrectionPanel
          currency={currency}
          onClose={() => setShowPanel(false)}
          onSuccess={handleSuccess}
        />
      )}
    </AppShell>
  )
}

export default CorrectionsPage
