import { useEffect, useState, useCallback } from 'react'
import { BarChart2, ChevronUp, ChevronDown } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const marginColor = pct => {
  const n = parseFloat(pct) || 0
  if (n >= 20) return 'text-success'
  if (n >= 10) return 'text-warning'
  return 'text-danger'
}

const marginBg = pct => {
  const n = parseFloat(pct) || 0
  if (n >= 20) return 'bg-green-50'
  if (n >= 10) return 'bg-amber-50'
  return 'bg-red-50'
}

const COLS = [
  { key: 'product_name', label: 'Product', align: '', getValue: r => r.product_name || r.name || '' },
  { key: 'qty', label: 'Qty sold (30d)', align: 'text-right', getValue: r => Number(r.total_qty_sold || r.quantity_sold || 0) },
  { key: 'revenue', label: 'Total revenue', align: 'text-right', getValue: r => Number(r.total_revenue || 0) },
  { key: 'cost', label: 'Total cost', align: 'text-right', getValue: r => Number(r.total_cost || 0) },
  { key: 'gross', label: 'Gross margin', align: 'text-right', getValue: r => Number(r.gross_margin || 0) },
  { key: 'margin_percentage', label: 'Margin %', align: 'text-right', getValue: r => parseFloat(r.margin_percentage) || 0 },
]

const MarginsPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'

  const [margins, setMargins] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('margin_percentage')
  const [sortDir, setSortDir] = useState('desc')

  const loadMargins = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const res = await api.get('/dashboard/margins')
      setMargins(res.data?.items || res.data || [])
    } catch { setMargins([]) }
    finally { setLoading(false) }
  }, [business?.id])

  useEffect(() => { loadMargins() }, [loadMargins])

  const handleSort = key => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...margins].sort((a, b) => {
    const col = COLS.find(c => c.key === sortKey)
    if (!col) return 0
    const va = col.getValue(a)
    const vb = col.getValue(b)
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronDown size={13} className="text-border inline ml-1" />
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-primary inline ml-1" />
      : <ChevronDown size={13} className="text-primary inline ml-1" />
  }

  return (
    <AppShell>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-navy">Product margins</h1>
        <p className="text-muted mt-1">Last 30 days · click a column to sort</p>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-bg-gray border-b border-border">
          {COLS.map(col => (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={`text-xs font-semibold text-muted uppercase tracking-wide hover:text-navy transition-colors flex items-center gap-0.5 ${col.align === 'text-right' ? 'justify-end' : ''}`}
            >
              {col.label}
              <SortIcon colKey={col.key} />
            </button>
          ))}
        </div>

        {loading ? (
          <div>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonRow key={i} cols={6} />)}</div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            iconBg="bg-blue-50"
            iconColor="text-primary"
            heading="No sales data yet to calculate margins"
            subtext="Record sales to start seeing your product margins here."
          />
        ) : (
          <div>
            {sorted.map((m, i) => {
              const pct = parseFloat(m.margin_percentage) || 0
              return (
                <div
                  key={m.product_id || m.id || i}
                  className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-bg-gray transition-colors items-center"
                >
                  <div>
                    <p className="font-semibold text-navy text-sm">{m.product_name || m.name}</p>
                    {m.sku && <p className="text-muted text-xs mt-0.5">SKU: {m.sku}</p>}
                  </div>
                  <p className="text-sm text-navy text-right font-medium">
                    {Number(m.total_qty_sold || m.quantity_sold || 0).toLocaleString('en-UG')}
                  </p>
                  <p className="text-sm text-navy text-right font-medium">{fmt(m.total_revenue, currency)}</p>
                  <p className="text-sm text-muted text-right">{fmt(m.total_cost, currency)}</p>
                  <p className="text-sm font-semibold text-navy text-right">{fmt(m.gross_margin, currency)}</p>
                  <div className="flex justify-end">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${marginColor(pct)} ${marginBg(pct)}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default MarginsPage
