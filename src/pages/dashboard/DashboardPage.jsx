import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, ClipboardList, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, Package, ArrowRight, Sparkles, PackagePlus,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import SkeletonCard, { SkeletonRow } from '../../components/ui/SkeletonCard'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') => {
  const num = Number(amount) || 0
  return `${currency} ${num.toLocaleString('en-UG')}`
}

// ─── Summary card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ icon: Icon, iconBg, iconColor, title, value, subLabel, subValue, loading }) => {
  if (loading) return <SkeletonCard lines={2} />
  return (
    <div className="card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
      <p className="text-muted text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-navy mt-1">{value}</p>
      {subLabel && (
        <p className="text-muted text-sm mt-2">
          {subLabel}{' '}
          {subValue !== undefined && <span className="font-semibold text-navy">{subValue}</span>}
        </p>
      )}
    </div>
  )
}

// ─── Activity type badge ──────────────────────────────────────────────────────
const txBadge = tx => {
  const type = tx.type?.toUpperCase() || tx.transaction_type?.toUpperCase() || ''
  if (type.includes('CASH') || tx.payment_type === 'CASH')
    return { label: 'Cash sale', cls: 'badge-success' }
  if (type.includes('DEBT') || tx.payment_type === 'ON_DEBT')
    return { label: 'Debt sale', cls: 'badge-warning' }
  if (type.includes('EXPENSE'))
    return { label: 'Expense', cls: 'badge-danger' }
  if (type.includes('PAYMENT'))
    return { label: 'Payment', cls: 'badge bg-blue-50 text-primary' }
  return { label: type || 'Transaction', cls: 'badge-neutral' }
}

const ActivityRow = ({ tx, currency }) => {
  const isIn = tx.type === 'CASH_SALE' || tx.type === 'PAYMENT' || (tx.amount > 0 && !tx.type?.includes('EXPENSE'))
  const badge = txBadge(tx)
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-border last:border-0">
      <p className="text-muted text-xs w-12 flex-shrink-0 font-mono">
        {new Date(tx.occurred_at || tx.created_at || tx.date).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <span className={`badge text-xs flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
      <p className="flex-1 text-sm text-navy font-medium truncate">
        {tx.description || tx.customer_name || tx.note || '—'}
      </p>
      <p className={`font-bold text-sm flex-shrink-0 ${isIn ? 'text-success' : 'text-danger'}`}>
        {isIn ? '+' : '−'}{fmt(Math.abs(tx.amount), currency)}
      </p>
    </div>
  )
}

// ─── Issue card ───────────────────────────────────────────────────────────────
const IssueCard = ({ icon: Icon, iconBg, iconColor, title, subtitle, variant }) => (
  <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border ${
    variant === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
  }`}>
    <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
      <Icon size={16} className={iconColor} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`font-semibold text-sm ${variant === 'red' ? 'text-danger' : 'text-amber-900'}`}>{title}</p>
      {subtitle && <p className={`text-xs mt-0.5 ${variant === 'red' ? 'text-red-600' : 'text-amber-700'}`}>{subtitle}</p>}
    </div>
  </div>
)

// ─── Opening Balance Nudge ────────────────────────────────────────────────────
const OpeningBalanceNudge = ({ business, currency, onDone }) => {
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handleSet = async () => {
    const parsed = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid amount (0 or more).')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await api.post(`/businesses/${business.id}/opening-balance`, {
        opening_balance: parsed,
      })
      onDone(res.data)
    } catch (err) {
      const code = err.response?.data?.detail || err.response?.data?.code || ''
      if (code === 'opening_balance_already_set' || err.response?.status === 422) {
        // Already set elsewhere — treat as success, hide the card
        onDone({ ...business, opening_balance_set_at: 'already_set' })
      } else {
        setError(err.response?.data?.detail || 'Could not save. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const currencyLabel = typeof currency === 'object' ? currency?.iso_code : currency || 'UGX'

  return (
    <div className="mb-6 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy text-base">Set your starting cash</p>
          <p className="text-muted text-sm mt-0.5">
            You skipped this during setup. Enter how much business money you had when you started.
          </p>

          {error && <p className="text-danger text-xs mt-2">{error}</p>}

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center border-2 border-border focus-within:border-primary rounded-xl bg-white transition-all duration-200 flex-1 max-w-xs">
              <input
                id="nudge-opening-balance"
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="flex-1 px-4 py-2.5 text-lg font-semibold text-navy bg-transparent outline-none"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <span className="pr-3 text-muted font-semibold text-sm">{currencyLabel}</span>
            </div>
            <button
              id="nudge-set-opening-balance-btn"
              onClick={handleSet}
              disabled={loading}
              className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? 'Saving…' : 'Set Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Zero-product Nudge ───────────────────────────────────────────────────────
const ZeroProductNudge = () => {
  const navigate = useNavigate()
  return (
    <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <PackagePlus size={20} className="text-warning" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-navy text-base">Add your first product</p>
          <p className="text-muted text-sm mt-0.5">
            You have no products yet. Add inventory to start tracking sales and stock levels.
          </p>
          <button
            id="nudge-add-first-product-btn"
            onClick={() => navigate('/products')}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-warning hover:underline"
          >
            Add a product <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user, business, updateBusiness } = useAuth()
  const navigate = useNavigate()
  const currency = business?.currency || 'UGX'

  const [todayData,       setTodayData]       = useState(null)
  const [stockAttention,  setStockAttention]  = useState(null)
  const [expensePressure, setExpensePressure] = useState(null)
  const [debtPriority,    setDebtPriority]    = useState([])
  const [transactions,    setTransactions]    = useState([])
  const [hasNoProducts,   setHasNoProducts]   = useState(false)

  const [loadingToday,  setLoadingToday]  = useState(true)
  const [loadingStock,  setLoadingStock]  = useState(true)
  const [loadingExpense, setLoadingExpense] = useState(true)

  const load = useCallback(async () => {
    if (!business?.id) {
      setLoadingToday(false)
      setLoadingStock(false)
      setLoadingExpense(false)
      return
    }

    // Always fetch /businesses/{id} on mount so opening_balance_set_at is fresh
    try {
      const bizRes = await api.get(`/businesses/${business.id}`)
      updateBusiness(bizRes.data)
    } catch {
      // Non-fatal — continue with whatever is in context
    }

    // Dashboard today
    try {
      const res = await api.get('/dashboard/today')
      setTodayData(res.data)
      setTransactions(res.data?.transactions || res.data?.activity || [])
    } catch {
      // fallback: use the business data already fetched above
    } finally {
      setLoadingToday(false)
    }

    // Stock attention
    try {
      const res = await api.get('/dashboard/stock-attention')
      setStockAttention(res.data)
    } catch {
      setStockAttention(null)
    } finally {
      setLoadingStock(false)
    }

    // Expense pressure
    try {
      const res = await api.get('/dashboard/expense-pressure')
      setExpensePressure(res.data)
    } catch {
      setExpensePressure(null)
    } finally {
      setLoadingExpense(false)
    }

    // Debt priority for issue cards
    try {
      const res = await api.get('/dashboard/debt-priority')
      setDebtPriority(res.data?.items || res.data || [])
    } catch {
      setDebtPriority([])
    }

    // Zero-product check (cheap: limit=1, only need total)
    try {
      const res = await api.get('/products?limit=1')
      const total = res.data?.total ?? res.data?.count ?? (Array.isArray(res.data) ? res.data.length : null)
      setHasNoProducts(total === 0)
    } catch {
      setHasNoProducts(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id])

  useEffect(() => { load() }, [load])

  const hours    = new Date().getHours()
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  // Issue items
  const criticalStock  = stockAttention?.items?.filter(i => ['OUT_OF_STOCK', 'CRITICAL'].includes(i.status)) || []
  const overdueDebts   = debtPriority.filter(d => d.urgency === 'OVERDUE').slice(0, 3)
  const hasIssues      = criticalStock.length > 0 || overdueDebts.length > 0

  // Expense pressure diff
  const expenseDiff = expensePressure
    ? (expensePressure.expenses_this_month || 0) - (expensePressure.expenses_last_month || 0)
    : 0

  // Show opening balance nudge when opening_balance_set_at is null (not just falsy)
  const showOpeningBalanceNudge = business?.opening_balance_set_at === null

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-muted mt-1">
          Here's how <span className="font-semibold text-navy">{business?.name || 'your shop'}</span> is doing today.
        </p>
      </div>

      {/* ── Onboarding nudge: set opening balance ── */}
      {showOpeningBalanceNudge && (
        <OpeningBalanceNudge
          business={business}
          currency={business?.currency}
          onDone={updatedBiz => updateBusiness(updatedBiz)}
        />
      )}

      {/* ── Onboarding nudge: add first product ── */}
      {hasNoProducts && !loadingToday && <ZeroProductNudge />}

      {/* ── Row 1: 3 summary cards ── */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <SummaryCard
          icon={Wallet}
          iconBg="bg-green-50"
          iconColor="text-success"
          title="Business money available now"
          value={loadingToday ? '—' : fmt(todayData?.cash_on_hand ?? todayData?.current_balance ?? todayData?.opening_balance ?? 0, currency)}
          loading={loadingToday}
        />
        <SummaryCard
          icon={ClipboardList}
          iconBg="bg-amber-50"
          iconColor="text-warning"
          title="Money customers owe you"
          value={loadingToday ? '—' : fmt(todayData?.total_debt_out ?? todayData?.total_debt ?? 0, currency)}
          subLabel={todayData?.debtor_count ? `from ${todayData.debtor_count} customers` : undefined}
          loading={loadingToday}
        />
        <SummaryCard
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-primary"
          title="Sales recorded today"
          value={loadingToday ? '—' : fmt(todayData?.sales_today ?? todayData?.today_sales ?? 0, currency)}
          loading={loadingToday}
        />
      </div>

      {/* ── Row 2: stock attention + expense pressure ── */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Stock attention */}
        <div className="card hover:shadow-card-hover transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                <Package size={18} className="text-warning" />
              </div>
              <p className="font-semibold text-navy">Stock attention</p>
            </div>
            <button onClick={() => navigate('/products')} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight size={13} />
            </button>
          </div>
          {loadingStock ? (
            <div className="skeleton h-8 w-1/2" />
          ) : stockAttention ? (
            <>
              <p className="text-3xl font-bold text-navy">
                {stockAttention.attention_count ?? stockAttention.count ?? 0}
              </p>
              <p className="text-muted text-sm mt-1">
                {stockAttention.attention_count > 0
                  ? 'items need your attention'
                  : 'All stock levels look good'}
              </p>
            </>
          ) : (
            <p className="text-muted text-sm">No data available.</p>
          )}
        </div>

        {/* Expense pressure */}
        <div className="card hover:shadow-card-hover transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <TrendingDown size={18} className="text-danger" />
              </div>
              <p className="font-semibold text-navy">Expense pressure</p>
            </div>
            <button onClick={() => navigate('/expenses')} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              View details <ArrowRight size={13} />
            </button>
          </div>
          {loadingExpense ? (
            <div className="skeleton h-8 w-1/2" />
          ) : expensePressure ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-navy">{fmt(expensePressure.expenses_this_month, currency)}</p>
                <p className="text-muted text-sm">this month</p>
              </div>
              {expenseDiff !== 0 && (
                <p className={`text-sm font-semibold flex items-center gap-1 ${expenseDiff > 0 ? 'text-danger' : 'text-success'}`}>
                  {expenseDiff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {fmt(Math.abs(expenseDiff), currency)} {expenseDiff > 0 ? 'more' : 'less'} than last month
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted text-sm">No data available.</p>
          )}
        </div>
      </div>

      {/* ── Issue cards ── */}
      <div className="mb-6">
        {hasIssues ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted uppercase tracking-wide">⚠ Needs attention</p>
            {criticalStock.map((item, i) => (
              <IssueCard
                key={i}
                icon={AlertTriangle}
                iconBg="bg-red-100"
                iconColor="text-danger"
                variant="red"
                title={item.name || item.product_name}
                subtitle={`${item.status === 'OUT_OF_STOCK' ? 'Out of stock' : 'Critical'} — ${item.stock_quantity ?? 0} remaining`}
              />
            ))}
            {overdueDebts.map((d, i) => (
              <IssueCard
                key={`debt-${i}`}
                icon={Clock}
                iconBg="bg-amber-100"
                iconColor="text-warning"
                variant="amber"
                title={`${d.customer_name || d.name} — ${fmt(d.total_debt || d.balance, currency)}`}
                subtitle={`Overdue since ${d.oldest_unpaid_date ? new Date(d.oldest_unpaid_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : 'unknown'}`}
              />
            ))}
            {overdueDebts.length > 0 && (
              <button onClick={() => navigate('/debt-priority')} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
                View all debts <ArrowRight size={13} />
              </button>
            )}
          </div>
        ) : !loadingToday && !loadingStock && (
          <div className="flex items-center gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle size={20} className="text-success flex-shrink-0" />
            <p className="font-semibold text-success">All clear — no urgent issues today.</p>
          </div>
        )}
      </div>

      {/* ── Activity feed ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-navy">Today's activity</h2>
            <p className="text-muted text-sm mt-0.5">
              {new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {loadingToday ? (
          <div className="space-y-1">
            {[1, 2, 3, 4].map(i => <SkeletonRow key={i} cols={3} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-navy">No transactions recorded today</p>
            <p className="text-muted text-sm mt-1">Record a sale to see it show up here.</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx, i) => (
              <ActivityRow key={tx.id || i} tx={tx} currency={currency} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default DashboardPage
