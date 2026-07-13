import { useState, useEffect } from 'react'
import { X, CheckCircle, CreditCard, ArrowRight } from 'lucide-react'
import WarningBanner from '../ui/WarningBanner'
import Button from '../ui/Button'
import Input from '../ui/Input'
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

const shortId = id => (id ? id.slice(0, 8) : '')

const RecordPaymentModal = ({ customer, currency, prefill, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    amount: prefill?.amount != null ? String(prefill.amount) : '',
    note: prefill?.note || '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState(null)
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4)

  const handleInputChange = field => e => {
    const val = e.target.value
    setForm(f => ({ ...f, [field]: val }))
    // new key per new user action (modifying inputs)
    setIdempotencyKey(uuidv4())
  }

  const validate = () => {
    const e = {}
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = 'Amount must be greater than 0.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setServerError('')
    try {
      const res = await api.post('/customer-payments', {
        customer_id: customer.id,
        amount: parseFloat(form.amount),
        note: form.note || null,
      }, {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      })
      setResult(res.data)
    } catch (err) {
      const isAlreadyPaid =
        err.response?.status === 422 ||
        err.response?.data?.code === 'debt_already_resolved' ||
        err.response?.data?.detail?.toLowerCase().includes('already paid') ||
        err.response?.data?.detail?.toLowerCase().includes('resolved')

      if (isAlreadyPaid) {
        setServerError('This debt was already paid')
        // Refresh the ledger/credit data instead
        if (onSuccess) onSuccess()
      } else {
        setServerError(err.response?.data?.detail || 'Could not record payment.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const warnings = result.warnings || []
    const allocations = result.allocations || []
    return (
      <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={18} className="text-success" />
              </div>
              <h2 className="text-lg font-bold text-navy">Payment recorded</h2>
            </div>
            <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
          </div>
          <div className="px-6 py-5 space-y-4">
            {warnings.includes('OVERPAYMENT') && (
              <WarningBanner message={`Payment exceeds the outstanding debt. ${formatMoney(result.unallocated_amount, currency)} was not allocated to any debt.`} />
            )}
            {allocations.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-navy">Allocations</p>
                <div className="space-y-2">
                  {allocations.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-bg-gray rounded-xl">
                      <ArrowRight size={14} className="text-success flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">
                          {a.receipt_number ? `Receipt #${a.receipt_number}` : `Sale ${shortId(a.sale_id)}`}
                        </p>
                        <p className="text-xs text-muted">Applied {formatMoney(a.allocated_amount, currency)} · {formatMoney(a.ledger_remaining, currency)} remaining</p>
                      </div>
                      <span className={`badge ${a.ledger_status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                        {a.ledger_status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">No open debt to allocate this payment to.</p>
            )}
            <div className="px-4 py-3 bg-bg-gray rounded-xl flex items-center justify-between">
              <span className="text-sm text-muted">New debt balance</span>
              <span className="font-bold text-navy">{formatMoney(result.customer_debt_balance_after, currency)}</span>
            </div>
            <Button onClick={() => { if (onSuccess) onSuccess(); onClose() }} fullWidth>Done</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <CreditCard size={18} className="text-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy">Record payment</h2>
              <p className="text-muted text-xs">{customer.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="px-4 py-3 bg-amber-50 rounded-xl text-sm">
              <p className="text-muted">Outstanding debt</p>
              <p className="font-bold text-danger text-lg">{formatMoney(customer.debt_balance, currency)}</p>
            </div>

            <p className="text-xs text-muted -mt-1">
              Payments are applied to the <strong>oldest</strong> open debt first — if an older debt exists, this amount may apply there instead.
            </p>

            <Input
              id="payment-amount"
              label="Amount"
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={handleInputChange('amount')}
              error={errors.amount}
            />

            <Input
              id="payment-note"
              label="Note"
              placeholder="e.g. Paid cash at shop"
              value={form.note}
              onChange={handleInputChange('note')}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" loading={loading} className="flex-1">Record payment</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RecordPaymentModal
