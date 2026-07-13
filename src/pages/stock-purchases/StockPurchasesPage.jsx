import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, ShoppingBag, ChevronDown, ChevronUp,
  Search, Trash2, UserPlus,
} from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SlidePanel from '../../components/ui/SlidePanel'
import DateGroupedList from '../../components/ui/DateGroupedList'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import WarningBanner from '../../components/ui/WarningBanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const today = () => new Date().toISOString().split('T')[0]

/**
 * Resolve supplier name from a purchase object.
 * Tries inline fields first; falls back to supplierMap lookup by supplier_id.
 *
 * Current API shape: { supplier_id: uuid, supplier_name_free: null }
 * The name lookup is done separately via GET /suppliers/{id} after loading.
 */
const resolveSupplierName = (item, supplierMap = {}) => {
  if (item.supplier && typeof item.supplier === 'object' && item.supplier.name)
    return item.supplier.name
  if (typeof item.supplier === 'string' && item.supplier.trim())
    return item.supplier
  if (item.supplier_name) return item.supplier_name
  if (item.supplier_name_free) return item.supplier_name_free
  // Look up from the fetched supplier map
  if (item.supplier_id && supplierMap[item.supplier_id])
    return supplierMap[item.supplier_id].name
  return null
}

// ─── Searchable Dropdown ─────────────────────────────────────────────────────
const SearchableDropdown = ({ placeholder, onSearch, results, onSelect, selected, renderResult, loading }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(selected?.name || '')
  const ref = useRef(null)

  useEffect(() => {
    if (selected) setQuery(selected.name || '')
  }, [selected])

  useEffect(() => {
    const handleClick = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChange = e => {
    setQuery(e.target.value)
    setOpen(true)
    onSearch(e.target.value)
  }

  const handleSelect = item => {
    setQuery(item.name || '')
    setOpen(false)
    onSelect(item)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input-field pl-10 py-2.5 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={() => { setOpen(true); onSearch(query) }}
        />
      </div>
      {open && (results.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-modal z-30 max-h-48 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          ) : results.map((item, i) => (
            <button
              key={item.id || i}
              type="button"
              className="w-full text-left px-4 py-3 text-sm hover:bg-bg-gray transition-colors border-b border-border last:border-0"
              onClick={() => handleSelect(item)}
            >
              {renderResult(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Record Purchase Panel ───────────────────────────────────────────────────
const RecordPurchasePanel = ({ onClose, onSuccess, currency }) => {
  const [supplier, setSupplier] = useState(null)
  const [supplierResults, setSupplierResults] = useState([])
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '' })
  const [savingSupplier, setSavingSupplier] = useState(false)

  const [lines, setLines] = useState([{ product: null, productResults: [], productLoading: false, qty: '', unit_cost: '' }])
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [dupWarning, setDupWarning] = useState(false)

  const supplierDebounce = useRef(null)
  const productDebounce = useRef({})

  const searchSupplier = query => {
    clearTimeout(supplierDebounce.current)
    supplierDebounce.current = setTimeout(async () => {
      setSupplierLoading(true)
      try {
        const res = await api.get('/suppliers', { params: { search: query } })
        setSupplierResults(res.data?.items || res.data || [])
      } catch { setSupplierResults([]) }
      finally { setSupplierLoading(false) }
    }, 300)
  }

  const searchProduct = (lineIdx, query) => {
    clearTimeout(productDebounce.current[lineIdx])
    productDebounce.current[lineIdx] = setTimeout(async () => {
      setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, productLoading: true } : l))
      try {
        const res = await api.get('/products', { params: { search: query, limit: 50 } })
        const results = res.data?.items || res.data || []
        setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, productResults: results, productLoading: false } : l))
      } catch {
        setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, productResults: [], productLoading: false } : l))
      }
    }, 300)
  }

  const addLine = () => setLines(prev => [...prev, { product: null, productResults: [], productLoading: false, qty: '', unit_cost: '' }])
  const removeLine = idx => setLines(prev => prev.filter((_, i) => i !== idx))
  const updateLine = (idx, field, value) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))

  const lineTotal = line => (parseFloat(line.qty) || 0) * (parseFloat(line.unit_cost) || 0)
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  const handleSaveSupplier = async () => {
    if (!newSupplier.name.trim()) return
    setSavingSupplier(true)
    try {
      const res = await api.post('/suppliers', newSupplier)
      setSupplier(res.data)
      setShowAddSupplier(false)
      setNewSupplier({ name: '', phone: '' })
    } catch { /* ignore */ }
    finally { setSavingSupplier(false) }
  }

  const validate = () => {
    const e = {}
    if (lines.every(l => !l.product)) e.lines = 'Add at least one product.'
    if (lines.some(l => l.product && (!l.qty || Number(l.qty) <= 0))) e.qty = 'All quantities must be greater than 0.'
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
      const payload = {
        supplier_id: supplier?.id || null,
        date,
        note: note || null,
        items: lines.filter(l => l.product).map(l => {
          const qty = parseInt(l.qty, 10)
          const unitCost = parseFloat(l.unit_cost) || 0
          return {
            product_id: l.product.id,
            product_name: l.product.name,
            quantity: qty,
            unit_buying_cost: unitCost,
            total_item_cost: qty * unitCost,
          }
        }),
      }
      const res = await api.post('/stock-purchases', payload)
      const warnings = res.data?.warnings || []
      if (warnings.includes('DUPLICATE_PRODUCT')) setDupWarning(true)
      onSuccess()
      if (!warnings.includes('DUPLICATE_PRODUCT')) onClose()
    } catch (err) {
      setServerError(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Could not save purchase.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlidePanel title="Record stock purchase" onClose={onClose} width="w-[580px]">
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 py-5 space-y-5 border-b border-border">
          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
              {serverError}
            </div>
          )}
          {dupWarning && (
            <WarningBanner message="The same product appears more than once. The purchase was saved. Review your items." />
          )}

          <div className="form-group">
            <label className="label">Supplier <span className="text-muted font-normal">(optional)</span></label>
            <SearchableDropdown
              placeholder="Search suppliers…"
              onSearch={searchSupplier}
              results={supplierResults}
              onSelect={s => setSupplier(s)}
              selected={supplier}
              loading={supplierLoading}
              renderResult={s => (
                <div>
                  <p className="font-semibold text-navy">{s.name}</p>
                  {s.phone && <p className="text-muted text-xs">{s.phone}</p>}
                </div>
              )}
            />
            {!showAddSupplier ? (
              <button
                type="button"
                onClick={() => setShowAddSupplier(true)}
                className="text-sm text-primary hover:underline font-medium mt-1.5 flex items-center gap-1"
              >
                <UserPlus size={14} />
                Add new supplier
              </button>
            ) : (
              <div className="mt-3 p-4 bg-bg-gray rounded-xl space-y-3 border border-border">
                <p className="text-sm font-semibold text-navy">New supplier</p>
                <Input id="new-supplier-name" placeholder="Supplier name" value={newSupplier.name} onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))} />
                <Input id="new-supplier-phone" placeholder="Phone (optional)" value={newSupplier.phone} onChange={e => setNewSupplier(s => ({ ...s, phone: e.target.value }))} />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddSupplier(false)} className="flex-1">Cancel</Button>
                  <Button type="button" size="sm" loading={savingSupplier} onClick={handleSaveSupplier} className="flex-1">Save supplier</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="px-6 py-5 space-y-4 border-b border-border">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-navy text-sm">Items purchased</p>
            {errors.lines && <p className="error-msg text-xs">{errors.lines}</p>}
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="p-4 bg-bg-gray rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Item {idx + 1}</p>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <SearchableDropdown
                placeholder="Search product…"
                onSearch={q => searchProduct(idx, q)}
                results={line.productResults}
                onSelect={p => updateLine(idx, 'product', p)}
                selected={line.product}
                loading={line.productLoading}
                renderResult={p => (
                  <div>
                    <p className="font-semibold text-navy">{p.name}</p>
                    {p.sku && <p className="text-muted text-xs">SKU: {p.sku}</p>}
                  </div>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input id={`line-qty-${idx}`} label="Qty" type="number" placeholder="0" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} error={errors.qty && !line.qty ? 'Required' : ''} />
                <Input id={`line-cost-${idx}`} label="Unit cost" type="number" placeholder="0" value={line.unit_cost} onChange={e => updateLine(idx, 'unit_cost', e.target.value)} left={<span className="text-xs font-semibold">{currency}</span>} />
                <div className="form-group">
                  <label className="label">Total price</label>
                  <div className="input-field bg-bg-gray text-muted text-sm">{fmt(lineTotal(line), currency)}</div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            Add item
          </button>

          <div className="flex items-center justify-between px-1">
            <p className="font-semibold text-navy text-sm">Total cost</p>
            <p className="font-bold text-navy text-lg">{fmt(grandTotal, currency)}</p>
          </div>
        </div>

        {/* Note + Date */}
        <div className="px-6 py-5 space-y-4 border-b border-border">
          <div className="form-group">
            <label htmlFor="purchase-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
            <textarea id="purchase-note" className="input-field resize-none" rows={2} placeholder="Any notes about this purchase?" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <Input id="purchase-date" label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="px-6 py-5 flex gap-3">
          {dupWarning ? (
            <Button type="button" onClick={onClose} className="flex-1">Done</Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" loading={loading} className="flex-1">Save purchase</Button>
            </>
          )}
        </div>
      </form>
    </SlidePanel>
  )
}

// ─── Purchase Row ─────────────────────────────────────────────────────────────
const PurchaseRow = ({ item, currency, supplierMap = {} }) => {
  const [expanded, setExpanded] = useState(false)
  const itemCount = item.items?.length || item.item_count || 0
  const supplierName = resolveSupplierName(item, supplierMap)

  return (
    <div>
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-bg-gray transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={17} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy text-sm">
            {supplierName ?? <span className="text-muted">No supplier</span>}
          </p>
          <p className="text-muted text-xs mt-0.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
        <p className="font-bold text-navy text-sm mr-3">{fmt(item.total_buying_cost, currency)}</p>
        {expanded
          ? <ChevronUp size={16} className="text-muted flex-shrink-0" />
          : <ChevronDown size={16} className="text-muted flex-shrink-0" />
        }
      </button>

      {expanded && item.items?.length > 0 && (
        <div className="bg-bg-gray border-t border-border">
          <div className="grid grid-cols-4 gap-3 px-5 py-2 border-b border-border">
            {['Product', 'Qty', 'Unit cost', 'Total'].map(h => (
              <p key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{h}</p>
            ))}
          </div>
          {item.items.map((line, i) => {
            const unitCost = line.unit_buying_cost ?? line.unit_cost ?? 0
            const total = line.total_item_cost ?? ((line.quantity || 0) * unitCost)
            return (
              <div key={i} className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-border last:border-0">
                <p className="text-sm font-medium text-navy truncate">
                  {line.product?.name || line.product_name_snapshot || line.product_name}
                </p>
                <p className="text-sm text-navy">{line.quantity}</p>
                <p className="text-sm text-muted">{fmt(unitCost, currency)}</p>
                <p className="text-sm font-semibold text-navy">{fmt(total, currency)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const StockPurchasesPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'

  const [purchases, setPurchases] = useState([])
  // { [supplier_id]: SupplierOut } — populated after purchases load,
  // one GET /suppliers/{id} per unique supplier_id, cached across reloads.
  const [supplierMap, setSupplierMap] = useState({})
  const [supplierList, setSupplierList] = useState([])  // for filter dropdown only
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [banner, setBanner] = useState('')

  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // Fetch supplier names for any supplier_id not yet in the cache.
  // Uses Promise.allSettled so one bad ID doesn't block the rest.
  const fetchMissingSuppliers = useCallback(async (purchaseList, existingMap) => {
    const missingIds = [...new Set(
      purchaseList
        .map(p => p.supplier_id)
        .filter(id => id && !existingMap[id])
    )]
    if (!missingIds.length) return existingMap

    const results = await Promise.allSettled(
      missingIds.map(id => api.get(`/suppliers/${id}`))
    )
    const updated = { ...existingMap }
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        updated[missingIds[i]] = result.value.data
      }
    })
    return updated
  }, [])

  const loadPurchases = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const params = {}
      if (filterSupplier) params.supplier_id = filterSupplier
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo
      const res = await api.get('/stock-purchases', { params })
      const list = res.data?.items || res.data || []
      setPurchases(list)
      // After setting purchases, fetch any supplier names we don't have yet
      setSupplierMap(prev => {
        fetchMissingSuppliers(list, prev).then(updated => setSupplierMap(updated))
        return prev
      })
    } catch { setPurchases([]) }
    finally { setLoading(false) }
  }, [business?.id, filterSupplier, filterFrom, filterTo, fetchMissingSuppliers])

  // Separate load for the supplier filter dropdown
  const loadSupplierList = useCallback(async () => {
    try {
      const res = await api.get('/suppliers')
      setSupplierList(res.data?.items || res.data || [])
    } catch { setSupplierList([]) }
  }, [])

  useEffect(() => { loadSupplierList() }, [loadSupplierList])
  useEffect(() => { loadPurchases() }, [loadPurchases])

  const clearFilters = () => {
    setFilterSupplier('')
    setFilterFrom('')
    setFilterTo('')
  }

  const hasFilters = filterSupplier || filterFrom || filterTo

  return (
    <AppShell>
      {banner && <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-navy">Stock purchases</h1>
        <Button id="record-purchase-btn" onClick={() => setShowPanel(true)} className="gap-2">
          <Plus size={16} />
          Record purchase
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          id="purchase-filter-supplier"
          className="input-field w-auto min-w-[160px] py-2.5 text-sm"
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
        >
          <option value="">All suppliers</option>
          {supplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input id="purchase-filter-from" type="date" className="input-field w-auto py-2.5 text-sm" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          <span className="text-muted text-sm">to</span>
          <input id="purchase-filter-to" type="date" className="input-field w-auto py-2.5 text-sm" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-primary hover:underline font-medium">
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-0 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={4} />)}
        </div>
      ) : (
        <DateGroupedList
          items={purchases}
          dateKey="occurred_at"
          renderItem={item => (
            <PurchaseRow item={item} currency={currency} supplierMap={supplierMap} />
          )}
          emptyState={
            <div className="card">
              <EmptyState
                icon={ShoppingBag}
                iconBg="bg-blue-50"
                iconColor="text-primary"
                heading="No stock purchases recorded yet"
                subtext="Record when you buy stock to track your inventory costs."
                action={{ label: 'Record purchase', onClick: () => setShowPanel(true) }}
              />
            </div>
          }
        />
      )}

      {showPanel && (
        <RecordPurchasePanel
          currency={currency}
          onClose={() => setShowPanel(false)}
          onSuccess={() => {
            loadPurchases()
            setBanner('Stock purchase saved successfully.')
          }}
        />
      )}
    </AppShell>
  )
}

export default StockPurchasesPage
