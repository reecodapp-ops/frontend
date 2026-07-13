import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Search, Phone, ChevronRight, X, Clock, TrendingDown,
  Plus, CreditCard, User, Ban, ChevronDown, ChevronUp
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SlidePanel from '../../components/ui/SlidePanel'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import DebtDetail from '../../components/shared/DebtDetail'
import RecordPaymentModal from '../../components/shared/RecordPaymentModal'
import PhoneNumberInput from '../../components/ui/PhoneNumberInput'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { formatMoney, formatDate, creditLevelMeta, CREDIT_LEVEL_OPTIONS, reecodColor } from '../../utils/format'



// ─── Add Customer Panel ───────────────────────────────────────────────────────
const AddCustomerPanel = ({ onClose, onSaved }) => {
  const { business } = useAuth()
  const defaultCountryId = business?.country_id
  
  const [form, setForm] = useState({ full_name: '', phone_country_id: '', phone_local_number: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Customer name is required.'
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
      const res = await api.post('/customers', {
        full_name: form.full_name.trim(),
        phone_country_id: form.phone_country_id ? Number(form.phone_country_id) : null,
        phone_local_number: form.phone_local_number ? form.phone_local_number.trim() : null,
      })
      onSaved(res.data)
      onClose()
    } catch (err) {
      if (err.response?.data?.code === 'invalid_phone_number' || err.response?.data?.detail?.toLowerCase().includes('phone')) {
        setErrors(prev => ({ ...prev, phone: err.response?.data?.detail || 'Invalid phone number.' }))
      } else {
        setServerError(err.response?.data?.detail || 'Could not save customer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlidePanel title="Add customer" onClose={onClose} width="w-[400px]">
      <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
        {serverError && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
        )}
        <Input id="cust-name" label="Customer name" placeholder="e.g. Sarah Akello" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
        
        <PhoneNumberInput
          id="cust-phone"
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

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">Save customer</Button>
        </div>
      </form>
    </SlidePanel>
  )
}

// ─── Customer Detail Panel ────────────────────────────────────────────────────
const CustomerDetail = ({ customer: initialCustomer, currency, onClose, onPaymentRecorded }) => {
  const { t } = useTranslation()
  const [credit, setCredit] = useState(null)
  const [ledger, setLedger] = useState([])
  const [trustScore, setTrustScore] = useState(null)
  const [valueScore, setValueScore] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [debtDetailRow, setDebtDetailRow] = useState(null)
  const [globalPaymentOpen, setGlobalPaymentOpen] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    try {
      const [creditRes, ledgerRes, trustScoreRes, valueScoreRes, historyRes] = await Promise.all([
        api.get(`/customers/${initialCustomer.id}/credit`),
        api.get(`/customers/${initialCustomer.id}/ledger`),
        api.get(`/customers/${initialCustomer.id}/scores`, { params: { view_mode: 'trust' } }).catch(() => null),
        api.get(`/customers/${initialCustomer.id}/scores`, { params: { view_mode: 'value' } }).catch(() => null),
        api.get('/customers/credit-history', { params: { customer_id: initialCustomer.id } }).catch(() => null),
      ])
      setCredit(creditRes.data)
      const ledgerItems = ledgerRes.data?.items || []
      ledgerItems.sort((a, b) => new Date(b.occurred_at || b.created_at || 0) - new Date(a.occurred_at || a.created_at || 0))
      setLedger(ledgerItems)

      if (trustScoreRes?.data) {
        setTrustScore(trustScoreRes.data.scores?.trust || trustScoreRes.data.trust || trustScoreRes.data)
      } else {
        setTrustScore(null)
      }

      if (valueScoreRes?.data) {
        setValueScore(valueScoreRes.data.scores?.value || valueScoreRes.data.value || valueScoreRes.data)
      } else {
        setValueScore(null)
      }

      setHistory(historyRes?.data?.items || [])
    } catch {
      setCredit(null)
      setLedger([])
      setTrustScore(null)
      setValueScore(null)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [initialCustomer.id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const handlePaymentRecorded = () => {
    setDebtDetailRow(null)
    setGlobalPaymentOpen(false)
    loadDetail()
    if (onPaymentRecorded) onPaymentRecorded()
  }

  const c = credit

  return (
    <>
      <div className="w-[460px] card p-0 overflow-hidden slide-in-right flex-shrink-0 flex flex-col max-h-[calc(100vh-130px)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">{(initialCustomer.full_name || 'C')[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-navy">{initialCustomer.full_name}</p>
              <p className="text-muted text-xs flex items-center gap-1">
                <Phone size={11} />
                {initialCustomer.phone_number || 'No phone'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={18} /></button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {loading ? (
            <div className="p-5 flex-1">{[1, 2, 3].map(i => <SkeletonRow key={i} cols={3} />)}</div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Summary Block */}
              <div className="px-5 py-5 bg-bg-gray border-b border-border space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-0.5">{t('customers.panel_total_debt')}</p>
                    {c?.debt_balance > 0 ? (
                      <p className="text-2xl font-bold text-danger">
                        {formatMoney(c.debt_balance, currency)}
                      </p>
                    ) : (
                      <p className="text-xl font-bold text-success">{t('customers.panel_owes_nothing')}</p>
                    )}
                    {c?.days_overdue > 0 && (
                      <p className="text-xs text-danger font-semibold flex items-center gap-1 mt-1">
                        <Clock size={11} />
                        {t('customers.panel_days_overdue', { count: c.days_overdue })}
                      </p>
                    )}
                  </div>
                  {c?.debt_balance > 0 && (
                    <Button size="sm" variant="success" onClick={() => setGlobalPaymentOpen(true)} className="gap-1.5 flex-shrink-0">
                      <CreditCard size={14} />
                      Record payment
                    </Button>
                  )}
                </div>

                {/* Score badge / pill & meaning */}
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">{t('customers.panel_credit_trust_score')}</p>
                  {(!trustScore || trustScore.status === 'insufficient_data') ? (
                    <div className="flex items-center gap-2">
                      <span className="badge bg-neutral text-muted text-xs border border-border">
                        {t('customers.panel_needs_more_records')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <span className={`badge px-2.5 py-1 text-xs font-bold ${reecodColor(trustScore.color).bg} ${reecodColor(trustScore.color).text}`}>
                        {trustScore.label}
                      </span>
                      <span className="text-xs text-muted font-medium mt-0.5 leading-normal">
                        {trustScore.meaning}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Debts List */}
              <div className="px-5 py-4 border-b border-border flex-1 min-h-[250px]">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{t('customers.panel_debts_list')}</h3>
                {ledger.length === 0 ? (
                  <div className="text-center py-10">
                    <TrendingDown size={28} className="text-border mx-auto mb-2" />
                    <p className="text-muted text-sm">{t('customers.panel_no_debts')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ledger.map(row => {
                      const isUnpaid = row.status === 'UNPAID'
                      const isPartial = row.status === 'PARTIAL'
                      const isPaid = row.status === 'PAID'

                      let badgeClass = ''
                      if (isUnpaid) badgeClass = 'bg-red-50 text-danger border border-danger/20 hover:bg-red-100'
                      else if (isPartial) badgeClass = 'bg-amber-50 text-warning border border-warning/20 hover:bg-amber-100'
                      else if (isPaid) badgeClass = 'bg-green-50 text-success border border-success/20 hover:bg-green-100'
                      else badgeClass = 'bg-bg-gray text-muted border border-border'

                      const receiptLabel = row.receipt_number ? `Receipt #${row.receipt_number}` : 'Debt record'

                      return (
                        <button
                          key={row.id}
                          onClick={() => setDebtDetailRow(row)}
                          className="w-full p-3 bg-surface border border-border rounded-xl flex items-center justify-between gap-4 text-left hover:bg-bg-gray transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-navy">{receiptLabel}</span>
                              <span className="text-[10px] text-muted">{formatDate(row.occurred_at || row.created_at)}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              {isPartial ? (
                                <span>
                                  Remaining: <strong className="text-danger">{formatMoney(row.remaining_amount, currency)}</strong> · Paid: {formatMoney(row.paid_amount, currency)} of {formatMoney(row.original_amount, currency)}
                                </span>
                              ) : isUnpaid ? (
                                <span>Amount: <strong>{formatMoney(row.remaining_amount, currency)}</strong></span>
                              ) : (
                                <span>Paid: <strong>{formatMoney(row.original_amount, currency)}</strong></span>
                              )}
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize flex-shrink-0 ${badgeClass}`}>
                            {row.status?.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Collapsible More Details */}
              <div className="border-t border-border flex-shrink-0 bg-bg-gray">
                <button
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="w-full px-5 py-4 flex items-center justify-between text-sm font-semibold text-navy hover:bg-border/20 transition-colors"
                >
                  <span>{t('customers.panel_more_details')}</span>
                  {detailsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {detailsExpanded && (
                  <div className="px-5 pb-6 space-y-6 slide-in-down border-t border-border/40 pt-4 bg-surface max-h-[300px] overflow-y-auto">
                    {/* Buyer Value Score */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">{t('customers.panel_buyer_value_score')}</h4>
                      {(!valueScore || valueScore.status === 'insufficient_data') ? (
                        <div className="flex items-center gap-2">
                          <span className="badge bg-neutral text-muted text-xs border border-border">
                            {t('customers.panel_needs_more_records')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <span className={`badge px-2.5 py-1 text-xs font-bold ${reecodColor(valueScore.color).bg} ${reecodColor(valueScore.color).text}`}>
                            {valueScore.label}
                          </span>
                          <span className="text-xs text-muted font-medium mt-0.5 leading-normal">
                            {valueScore.meaning}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Credit Event History Timeline */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">{t('customers.panel_credit_events')}</h4>
                      {history.length === 0 ? (
                        <p className="text-xs text-muted italic">{t('customers.panel_no_credit_events')}</p>
                      ) : (
                        <div className="space-y-2">
                          {history.map(h => (
                            <div key={h.issue_id} className="p-3 bg-bg-gray rounded-xl flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-navy">{h.headline}</p>
                                <span className="text-[10px] text-muted block mt-1">{formatDate(h.created_at)}</span>
                              </div>
                              <Badge variant={h.severity === 'ALERT' ? 'danger' : h.severity === 'WARN' ? 'warning' : 'info'}>
                                {h.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {debtDetailRow && (
        <DebtDetail
          row={debtDetailRow}
          customer={initialCustomer}
          currency={currency}
          onClose={() => setDebtDetailRow(null)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}

      {globalPaymentOpen && (
        <RecordPaymentModal
          customer={{ ...initialCustomer, debt_balance: c?.debt_balance ?? 0 }}
          currency={currency}
          prefill={{ amount: c?.debt_balance }}
          onClose={() => setGlobalPaymentOpen(false)}
          onSuccess={handlePaymentRecorded}
        />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CustomersPage = () => {
  const { business } = useAuth()
  const { t } = useTranslation()
  const currency = business?.currency || { iso_code: 'UGX', symbol: 'USh', decimal_places: 0 }

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creditLevel, setCreditLevel] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [blockedOnly, setBlockedOnly] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [banner, setBanner] = useState('')
  const searchDebounce = useRef(null)

  const loadCustomers = useCallback(async (overrides = {}) => {
    setLoading(true)
    try {
      const params = { search: overrides.search ?? search, limit: 100 }
      const level = overrides.creditLevel ?? creditLevel
      if (level) params.credit_level = level
      const overdue = overrides.overdueOnly ?? overdueOnly
      if (overdue) params.overdue = true
      const blocked = overrides.blockedOnly ?? blockedOnly
      if (blocked) params.is_blocked = true

      const res = await api.get('/customers', { params })
      setCustomers(res.data?.items || [])
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [search, creditLevel, overdueOnly, blockedOnly])

  useEffect(() => { loadCustomers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = e => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => loadCustomers({ search: q }), 300)
  }
  const handleCreditLevelChange = e => { setCreditLevel(e.target.value); loadCustomers({ creditLevel: e.target.value }) }
  const toggleOverdue = () => { const v = !overdueOnly; setOverdueOnly(v); loadCustomers({ overdueOnly: v }) }
  const toggleBlocked = () => { const v = !blockedOnly; setBlockedOnly(v); loadCustomers({ blockedOnly: v }) }

  const handleAddSaved = newCust => {
    setCustomers(prev => [newCust, ...prev])
    setSelected(newCust)
    setBanner(t('customers.added_success', { name: newCust.full_name }))
  }

  return (
    <AppShell>
      {banner && <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t('customers.title')}</h1>
          <p className="text-muted mt-1">{t('customers.count', { count: customers.length })}</p>
        </div>
        <Button onClick={() => setShowAddPanel(true)} className="gap-2">
          <Plus size={16} /> {t('customers.add_customer')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select className="input-field w-auto py-2 text-sm" value={creditLevel} onChange={handleCreditLevelChange}>
          {CREDIT_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={toggleOverdue}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${overdueOnly ? 'bg-red-50 border-danger text-danger' : 'bg-surface border-border text-muted hover:text-navy'}`}
        >
          <Clock size={14} /> {t('customers.filter_overdue')}
        </button>
        <button
          onClick={toggleBlocked}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${blockedOnly ? 'bg-red-50 border-danger text-danger' : 'bg-surface border-border text-muted hover:text-navy'}`}
        >
          <Ban size={14} /> {t('customers.filter_blocked')}
        </button>
      </div>

      <div className="flex gap-6">
        <div className={`flex-1 card p-0 overflow-hidden transition-all duration-300 ${selected ? 'rounded-r-none' : ''}`}>
          <div className="px-6 py-4 border-b border-border">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Search by name or phone…" className="input-field pl-10 py-2.5 text-sm" value={search} onChange={handleSearch} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-bg-gray border-b border-border">
            {['Name', 'Credit level', 'Debt balance', 'Last activity'].map(h => (
              <p key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{h}</p>
            ))}
          </div>

          {loading ? (
            <div>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={4} />)}</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16">
              <User size={36} className="text-border mx-auto mb-3" />
              <p className="font-semibold text-navy">No customers found</p>
              <p className="text-muted text-sm mt-1">Try adjusting your filters, or add a new customer.</p>
            </div>
          ) : (
            <div>
              {customers.map(c => {
                const levelMeta = creditLevelMeta(c.credit_level)
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full grid grid-cols-4 gap-4 px-6 py-4 border-b border-border last:border-0 text-left hover:bg-bg-gray transition-colors ${selected?.id === c.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{(c.full_name || 'C')[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy text-sm truncate">{c.full_name}</p>
                        <p className="text-xs text-muted flex items-center gap-1 truncate"><Phone size={10} /> {c.phone_number || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={levelMeta.variant}>{levelMeta.label}</Badge>
                      {c.is_credit_blocked && <Ban size={13} className="text-danger" />}
                    </div>
                    <div>
                      <Badge variant={(c.debt_balance || 0) > 0 ? 'warning' : 'success'}>{formatMoney(c.debt_balance, currency)}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{c.last_transaction_at ? formatDate(c.last_transaction_at) : 'No activity yet'}</span>
                      <ChevronRight size={16} className="text-border" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selected && (
          <CustomerDetail
            customer={selected}
            currency={currency}
            onClose={() => setSelected(null)}
            onPaymentRecorded={() => { loadCustomers(); setBanner('Payment recorded successfully.') }}
          />
        )}
      </div>

      {showAddPanel && <AddCustomerPanel onClose={() => setShowAddPanel(false)} onSaved={handleAddSaved} />}
    </AppShell>
  )
}

export default CustomersPage
