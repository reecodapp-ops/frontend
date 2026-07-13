import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Receipt, Plus, X, ChevronRight, CreditCard, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ReceiptView from '../../components/sales/ReceiptView'
import RecordPaymentModal from '../../components/shared/RecordPaymentModal'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { formatMoney, formatDate } from '../../utils/format'

const PAYMENT_TYPE_LABEL = { 1: 'CASH', 2: 'ON_DEBT' }

const isOverdue = (sale) => {
  const paymentType = sale.payment_type_id === 2 ? 'ON_DEBT' : PAYMENT_TYPE_LABEL[sale.payment_type_id]
  if (paymentType !== 'ON_DEBT') return false
  
  const outstanding = sale.outstanding_amount ?? sale.remaining_amount ?? 0
  if (outstanding <= 0) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (sale.due_date) {
    const due = new Date(sale.due_date)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  // No due_date, check if > 30 days old
  const created = new Date(sale.occurred_at || sale.created_at)
  const diffTime = today - created
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 30
}

const SalesListPage = () => {
  const { business } = useAuth()
  const { t } = useTranslation()
  const currency = business?.currency || { iso_code: 'UGX', symbol: 'USh', decimal_places: 0 }
  const navigate = useNavigate()

  const [sales, setSales] = useState([])
  const [customerNames, setCustomerNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('')
  const [order, setOrder] = useState('recent')
  const searchDebounce = useRef(null)

  const [selectedSale, setSelectedSale] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [paymentCustomer, setPaymentCustomer] = useState(null)

  useEffect(() => {
    api.get('/customers', { params: { limit: 100 } })
      .then(res => {
        const map = {}
        for (const c of (res.data?.items || [])) map[c.id] = c.full_name
        setCustomerNames(map)
      })
      .catch(() => {})
  }, [])

  const loadSales = useCallback(async (overrides = {}) => {
    setLoading(true)
    setLoadError(false)
    try {
      const params = { limit: 100, order: overrides.order ?? order }
      const rn = overrides.search ?? search
      if (rn) {
        params.search = rn
        params.receipt_number = rn
      }
      const pt = overrides.paymentType ?? paymentTypeFilter
      if (pt) params.payment_type = pt

      const res = await api.get('/sales', { params })
      setSales(Array.isArray(res.data?.sales) ? res.data.sales : [])
    } catch (err) {
      setSales([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [search, paymentTypeFilter, order])

  useEffect(() => { loadSales() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = e => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => loadSales({ search: q }), 300)
  }

  const handlePaymentTypeChange = e => {
    const v = e.target.value
    setPaymentTypeFilter(v)
    loadSales({ paymentType: v })
  }

  const handleOrderChange = e => {
    const v = e.target.value
    setOrder(v)
    loadSales({ order: v })
  }

  const openReceipt = async sale => {
    setSelectedSale(sale)
    setReceipt(null)
    setReceiptError('')
    setLoadingReceipt(true)
    try {
      const receiptRes = await api.get(`/sales/${sale.id}/receipt`)
      const receiptData = receiptRes.data

      let dueDate = receiptData.due_date || null
      let note = receiptData.note || null
      let customerPhone = receiptData.customer_phone || null

      // Pull from sale detail if missing on receipt endpoint
      if (!dueDate || !note) {
        try {
          const detailRes = await api.get(`/sales/${sale.id}`)
          dueDate = dueDate || detailRes.data.due_date || null
          note = note || detailRes.data.note || null
        } catch { /* ignore */ }
      }

      if (sale.customer_id && !customerPhone) {
        try {
          const custRes = await api.get(`/customers/${sale.customer_id}`)
          customerPhone = custRes.data.phone_number || null
        } catch { /* ignore */ }
      }

      setReceipt({
        ...receiptData,
        customer_id: sale.customer_id || receiptData.customer_id || null,
        outstanding_amount: receiptData.outstanding_amount ?? (sale.outstanding_amount ?? 0),
        due_date: dueDate,
        note,
        customer_phone: customerPhone
      })
    } catch (err) {
      setReceiptError(err.response?.data?.detail || 'Could not load this receipt.')
    } finally {
      setLoadingReceipt(false)
    }
  }

  const handleOpenPaymentModal = async () => {
    if (!receipt?.customer_id) return
    try {
      const res = await api.get(`/customers/${receipt.customer_id}/credit`)
      setPaymentCustomer({
        id: receipt.customer_id,
        full_name: receipt.customer_name || 'Customer',
        debt_balance: res.data.debt_balance,
      })
    } catch {
      setPaymentCustomer({
        id: receipt.customer_id,
        full_name: receipt.customer_name || 'Customer',
        debt_balance: receipt.outstanding_amount || 0,
      })
    }
  }

  const handlePaymentSuccess = () => {
    loadSales()
    if (selectedSale) {
      openReceipt(selectedSale)
    }
  }

  const getPaymentBadge = (sale) => {
    const paymentType = sale.payment_type_id === 1 ? 'CASH' : 'ON_DEBT'
    const outstanding = sale.outstanding_amount ?? sale.remaining_amount ?? 0

    if (paymentType === 'CASH') {
      return <Badge variant="success">{t('sales.badge_cash')}</Badge>
    }

    if (outstanding === 0) {
      return (
        <span className="badge bg-teal-50 text-teal-700 border border-teal-200/50 font-bold uppercase text-[10px]">
          {t('sales.badge_debt_cleared')}
        </span>
      )
    }

    if (isOverdue(sale)) {
      return <Badge variant="danger">{t('sales.badge_overdue')}</Badge>
    }

    return <Badge variant="warning">{t('sales.badge_on_debt')}</Badge>
  }

  return (
    <AppShell>
      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4 text-sm text-danger">
          <span>Couldn't load sales — check your connection</span>
          <Button size="sm" variant="secondary" onClick={() => loadSales()} className="border-danger text-danger hover:bg-red-50">
            Retry
          </Button>
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t('sales.title')}</h1>
          <p className="text-muted mt-1">
            {t('sales.count', { count: sales.length })}
          </p>
        </div>
        <Button onClick={() => navigate('/sales/new')} className="gap-2">
          <Plus size={16} /> {t('sales.record_sale')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={t('sales.search_placeholder')}
            className="input-field pl-10 py-2.5 text-sm w-full"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <select className="input-field w-auto py-2 text-sm" value={paymentTypeFilter} onChange={handlePaymentTypeChange}>
          <option value="">{t('sales.filter_all_types')}</option>
          <option value="CASH">{t('sales.filter_cash')}</option>
          <option value="ON_DEBT">{t('sales.filter_on_debt')}</option>
        </select>
        <select className="input-field w-auto py-2 text-sm" value={order} onChange={handleOrderChange}>
          <option value="recent">{t('sales.sort_recent')}</option>
          <option value="oldest">{t('sales.sort_oldest')}</option>
          <option value="amount_desc">{t('sales.sort_amount_desc')}</option>
          <option value="amount_asc">{t('sales.sort_amount_asc')}</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* ── Sales table ── */}
        <div className={`flex-1 card p-0 overflow-hidden transition-all duration-300 ${selectedSale ? 'rounded-r-none' : ''}`}>
          <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-bg-gray border-b border-border">
            {[t('sales.col_receipt'), t('sales.col_date'), t('sales.col_customer'), t('sales.col_payment'), t('sales.col_total')].map(h => (
              <p key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{h}</p>
            ))}
          </div>

          {loading ? (
            <div>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={5} />)}</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-16">
              <Receipt size={36} className="text-border mx-auto mb-3" />
              <p className="font-semibold text-navy">{t('sales.no_sales')}</p>
              <p className="text-muted text-sm mt-1">{t('sales.no_sales_hint')}</p>
            </div>
          ) : (
            <div>
              {sales.map(sale => {
                return (
                  <button
                    key={sale.id}
                    onClick={() => openReceipt(sale)}
                    className={`w-full grid grid-cols-5 gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-bg-gray transition-colors text-left ${selectedSale?.id === sale.id ? 'bg-blue-50' : ''}`}
                  >
                    <p className="text-sm font-semibold text-navy self-center">
                      {sale.receipt_number ? `#${sale.receipt_number}` : '—'}
                    </p>
                    <p className="text-sm text-muted self-center">{formatDate(sale.occurred_at)}</p>
                    <p className="text-sm text-muted self-center truncate">
                      {sale.customer_id ? (customerNames[sale.customer_id] || '…') : t('sales.walk_in')}
                    </p>
                    <div className="self-center">
                      {getPaymentBadge(sale)}
                    </div>
                    <div className="flex items-center justify-between self-center">
                      <span className="text-sm font-semibold text-navy">{formatMoney(sale.total_amount, currency)}</span>
                      <ChevronRight size={16} className="text-border" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Receipt panel ── */}
        {selectedSale && (
          <div className="w-[480px] flex-shrink-0 card p-0 overflow-hidden slide-in-right flex flex-col max-h-[calc(100vh-160px)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <p className="font-bold text-navy">{t('sales.receipt_panel_title')}</p>
              <button onClick={() => { setSelectedSale(null); setReceipt(null) }} className="text-muted hover:text-navy transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingReceipt ? (
                <p className="text-muted text-sm text-center py-10">{t('sales.loading_receipt')}</p>
              ) : receiptError ? (
                <p className="error-msg text-sm text-center py-10">{receiptError}</p>
              ) : receipt ? (
                <ReceiptView
                  receipt={receipt}
                  currency={currency}
                  showActions={false}
                />
              ) : null}
            </div>
            {receipt && !loadingReceipt && (
              <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-2">
                {receipt.outstanding_amount > 0 && (
                  <Button onClick={handleOpenPaymentModal} fullWidth variant="success" className="gap-2">
                    <CreditCard size={16} /> {t('sales.record_payment')}
                  </Button>
                )}
                <Button onClick={() => navigate(`/sales/${selectedSale.id}/edit`)} fullWidth variant="secondary">
                  {t('sales.edit_sale')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {paymentCustomer && (
        <RecordPaymentModal
          customer={paymentCustomer}
          currency={currency}
          prefill={{ amount: receipt?.outstanding_amount }}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </AppShell>
  )
}

export default SalesListPage
