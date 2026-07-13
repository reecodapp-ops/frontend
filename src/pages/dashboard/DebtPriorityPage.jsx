import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Phone, Clock, ChevronRight } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const urgencyConfig = {
  OVERDUE: { variant: 'danger', label: 'Overdue' },
  DUE_SOON: { variant: 'warning', label: 'Due soon' },
  ON_TRACK: { variant: 'success', label: 'On track' },
}

const DebtPriorityPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'
  const navigate = useNavigate()

  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDebtors = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const res = await api.get('/dashboard/debt-priority')
      setDebtors(res.data?.items || res.data || [])
    } catch { setDebtors([]) }
    finally { setLoading(false) }
  }, [business?.id])

  useEffect(() => { loadDebtors() }, [loadDebtors])

  return (
    <AppShell>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-navy">Debt priority</h1>
        <p className="text-muted mt-1">Customers with highest balances shown first.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[32px_1fr_140px_160px_140px_120px] gap-4 px-6 py-3 bg-bg-gray border-b border-border">
          {['#', 'Customer', 'Phone', 'Total debt', 'Oldest unpaid', 'Urgency'].map(h => (
            <p key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {loading ? (
          <div>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonRow key={i} cols={6} />)}</div>
        ) : debtors.length === 0 ? (
          <EmptyState
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-primary"
            heading="No outstanding debts"
            subtext="All your customers are paid up. Great job!"
          />
        ) : (
          <div>
            {debtors.map((d, idx) => {
              const urgency = urgencyConfig[d.urgency] || { variant: 'neutral', label: d.urgency || '—' }
              return (
                <button
                  key={d.id || idx}
                  onClick={() => navigate('/customers')}
                  className="w-full grid grid-cols-[32px_1fr_140px_160px_140px_120px] gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-bg-gray transition-colors text-left"
                >
                  {/* Rank */}
                  <div className="flex items-center">
                    <span className={`text-sm font-bold ${idx === 0 ? 'text-danger' : idx === 1 ? 'text-warning' : 'text-muted'}`}>
                      {idx + 1}
                    </span>
                  </div>

                  {/* Customer name */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {(d.customer_name || d.name || 'C')[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-navy text-sm truncate">
                      {d.customer_name || d.name}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-1.5 text-sm text-muted">
                    <Phone size={13} />
                    <span className="truncate">{d.phone || '—'}</span>
                  </div>

                  {/* Total debt */}
                  <div className="flex items-center">
                    <span className="font-bold text-danger text-sm">{fmt(d.total_debt || d.balance, currency)}</span>
                  </div>

                  {/* Oldest unpaid */}
                  <div className="flex items-center gap-1.5 text-sm text-muted">
                    <Clock size={13} />
                    <span>
                      {d.oldest_unpaid_date
                        ? new Date(d.oldest_unpaid_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
                        : '—'}
                    </span>
                  </div>

                  {/* Urgency + chevron */}
                  <div className="flex items-center justify-between">
                    <Badge variant={urgency.variant}>{urgency.label}</Badge>
                    <ChevronRight size={15} className="text-border" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default DebtPriorityPage
