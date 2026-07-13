import { useEffect, useState, useRef, useCallback } from 'react'
import { Search, Plus, X, Package, BarChart2, AlertTriangle, RefreshCw, History, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import { SkeletonRow } from '../../components/ui/SkeletonCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import SlidePanel from '../../components/ui/SlidePanel'
import WarningBanner from '../../components/ui/WarningBanner'
import ConfirmationBanner from '../../components/ui/ConfirmationBanner'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (amount, currency = 'UGX') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-UG')}`

const stockBadge = product => {
  const qty = parseFloat(product.stock_on_hand) || 0
  const threshold = parseFloat(product.low_stock_level) || 5

  let status
  if (qty === 0) status = 'OUT_OF_STOCK'
  else if (qty <= threshold * 0.5) status = 'CRITICAL'
  else if (qty <= threshold) status = 'LOW'
  else status = 'OK'

  const map = {
    OK: { variant: 'success', label: 'OK' },
    LOW: { variant: 'warning', label: `Low — ${qty}` },
    CRITICAL: { variant: 'danger', label: `Critical — ${qty}` },
    OUT_OF_STOCK: { variant: 'danger', label: 'Out of stock' },
  }
  return map[status] || { variant: 'neutral', label: status }
}

// ─── Supplier Search dropdown for Restock Modal ───────────────────────────────
const SupplierSearch = ({ value, onSelect, error }) => {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounce = useRef(null)
  const ref = useRef(null)

  useEffect(() => { if (value) setQuery(value.name || '') }, [value])

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
        const res = await api.get('/suppliers', { params: { search: q, limit: 20 } })
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
          placeholder="Search supplier… (optional)"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); search(e.target.value); onSelect(null) }}
          onFocus={() => { setOpen(true); search(query) }}
        />
      </div>
      {open && (results.length > 0 || searching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-modal z-30 max-h-48 overflow-y-auto">
          {searching ? (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          ) : results.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setQuery(s.name); setOpen(false); onSelect(s) }}
              className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-bg-gray transition-colors border-b border-border last:border-0 text-left"
            >
              <div>
                <p className="font-semibold text-navy">{s.name}</p>
                {s.phone_number && <p className="text-xs text-muted">{s.phone_number}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Restock Modal ────────────────────────────────────────────────────────────
const RestockModal = ({ product, currency, onClose, onSaved }) => {
  const [supplier, setSupplier] = useState(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [quickAddError, setQuickAddError] = useState('')
  const [qty, setQty] = useState('1')
  const [unitCost, setUnitCost] = useState(String(product.buying_price || ''))
  const [promisedDelivery, setPromisedDelivery] = useState('')
  const [actualDelivery, setActualDelivery] = useState('')
  const [note, setNote] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [warning, setWarning] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!qty || isNaN(qty) || Number(qty) <= 0) {
      setServerError('Quantity must be greater than 0.')
      return
    }
    if (!unitCost || isNaN(unitCost) || Number(unitCost) < 0) {
      setServerError('Unit cost must be 0 or more.')
      return
    }
    setLoading(true)
    setServerError('')
    setWarning('')

    const parsedQty = parseInt(qty, 10)
    const parsedCost = parseFloat(unitCost)

    const payload = {
      supplier_id: supplier?.id || null,
      date: new Date().toISOString().split('T')[0],
      note: note.trim() || null,
      items: [{
        product_id: product.id,
        product_name: product.name,
        quantity: parsedQty,
        unit_buying_cost: parsedCost,
        total_item_cost: parsedQty * parsedCost,
      }],
      promised_delivery_date: promisedDelivery || null,
      actual_delivery_date: actualDelivery || null,
    }

    try {
      const res = await api.post('/stock-purchases', payload)
      const warnings = res.data?.warnings || []
      
      if (warnings.includes('PRICE_INCREASE')) {
        setWarning("This price is noticeably higher than what you've recently paid for this item. Saved anyway — check your selling price still gives you a good margin.")
        setSuccess(true)
      } else {
        onSaved()
        onClose()
      }
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Could not record restock.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold text-navy font-semibold">Restock — {product.name}</h2>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
          )}
          {warning && (
            <WarningBanner message={warning} />
          )}

          <div className="form-group">
            <label className="label">Product</label>
            <div className="input-field bg-bg-gray text-muted cursor-not-allowed font-semibold py-2.5 select-none">
              {product.name} (Current stock: {product.stock_on_hand})
            </div>
          </div>

          <div className="form-group">
            <label className="label">Supplier <span className="text-muted font-normal">(optional)</span></label>
            <SupplierSearch value={supplier} onSelect={s => { setSupplier(s); if (s) setShowQuickAdd(false) }} />
            {!showQuickAdd ? (
              <button
                type="button"
                onClick={() => { setShowQuickAdd(true); setQuickAddName(''); setQuickAddError('') }}
                className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                <UserPlus size={12} /> Add new supplier
              </button>
            ) : (
              <div className="mt-2 p-3 bg-bg-gray border border-border rounded-xl space-y-2">
                <p className="text-xs font-semibold text-navy">Quick-add supplier</p>
                {quickAddError && <p className="text-xs text-danger">{quickAddError}</p>}
                <input
                  type="text"
                  className="input-field py-2 text-sm"
                  placeholder="Supplier name"
                  value={quickAddName}
                  onChange={e => setQuickAddName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowQuickAdd(false)}
                  >Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    loading={quickAddLoading}
                    className="flex-1"
                    onClick={async () => {
                      if (!quickAddName.trim()) { setQuickAddError('Name is required.'); return }
                      setQuickAddLoading(true)
                      setQuickAddError('')
                      try {
                        const res = await api.post('/suppliers', { name: quickAddName.trim() })
                        setSupplier(res.data)
                        setShowQuickAdd(false)
                      } catch (err) {
                        setQuickAddError(err.response?.data?.detail || 'Could not add supplier.')
                      } finally {
                        setQuickAddLoading(false)
                      }
                    }}
                  >Save</Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="restock-qty" label="Quantity" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
            <Input id="restock-unit-cost" label={`Unit cost (${currency})`} type="number" min="0" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="restock-promised" label="Promised delivery" type="date" value={promisedDelivery} onChange={e => setPromisedDelivery(e.target.value)} />
            <Input id="restock-actual" label="Actual delivery" type="date" value={actualDelivery} onChange={e => setActualDelivery(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="restock-note" className="label">Note <span className="text-muted font-normal">(optional)</span></label>
            <textarea id="restock-note" className="input-field resize-none" rows={2} placeholder="e.g. Price negotiated down" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            {success ? (
              <Button type="button" onClick={() => { onSaved(); onClose() }} className="flex-1">Done</Button>
            ) : (
              <Button type="submit" loading={loading} className="flex-1">Record Restock</Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Purchase History Modal ───────────────────────────────────────────────────
const PurchaseHistoryModal = ({ productId, productName, currency, onClose }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/stock-purchases', { params: { product_id: productId, limit: 100 } })
        setHistory(res.data?.items || res.data || [])
      } catch (err) {
        setError('Could not load purchase history.')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [productId])

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-lg fade-in max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-navy">Purchase history</h2>
            <p className="text-muted text-xs mt-0.5">{productName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <SkeletonRow key={i} cols={4} />)}
            </div>
          ) : error ? (
            <p className="error-msg text-sm text-center py-6">{error}</p>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <Package size={32} className="text-border mx-auto mb-2" />
              <p className="text-muted text-sm">No purchases recorded for this product yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((purchase, index) => {
                const matchedItem = purchase.items?.find(it => it.product_id === productId)
                const supplierName = purchase.supplier?.name || purchase.supplier_name || purchase.supplier_name_free || 'Walk-in / Unknown'
                return (
                  <div key={purchase.id || index} className="p-4 bg-bg-gray rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-navy">{supplierName}</p>
                      <p className="text-xs text-muted mt-0.5">Purchased on {formatDate(purchase.occurred_at || purchase.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-navy">
                        {matchedItem ? `${matchedItem.quantity} units` : '—'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {matchedItem ? `${formatMoney(matchedItem.unit_buying_cost, currency)} each` : '—'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button onClick={onClose} fullWidth>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Form (shared by Add modal and Edit panel) ────────────────────────
const ProductForm = ({
  initialValues = {},
  categories = [],
  currency,
  onSubmit,
  loading,
  serverError,
  warning,
  onCancel,
  submitLabel = 'Save product',
  extraBottom,
  lockStock = false,
}) => {
  const [form, setForm] = useState({
    name: initialValues.name || '',
    category_id: initialValues.category_id || initialValues.category?.id || '',
    buying_price: initialValues.buying_price != null ? String(initialValues.buying_price) : '',
    selling_price: initialValues.selling_price != null ? String(initialValues.selling_price) : '',
    stock_on_hand: initialValues.stock_on_hand != null ? String(initialValues.stock_on_hand) : '',
    low_stock_level: initialValues.low_stock_level != null ? String(initialValues.low_stock_level) : '5',
    sku: initialValues.sku || '',
  })
  const [errors, setErrors] = useState({})

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required.'
    if (!form.buying_price || isNaN(form.buying_price)) e.buying_price = 'Enter a valid buying price.'
    if (!form.selling_price || isNaN(form.selling_price)) e.selling_price = 'Enter a valid selling price.'
    if (!lockStock && (form.stock_on_hand === '' || isNaN(form.stock_on_hand))) e.stock_on_hand = 'Enter the stock quantity.'
    if (!form.low_stock_level || isNaN(form.low_stock_level)) e.low_stock_level = 'Enter the alert threshold.'
    return e
  }

  const handleSubmit = e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      buying_price: parseFloat(form.buying_price),
      selling_price: parseFloat(form.selling_price),
      low_stock_level: parseInt(form.low_stock_level, 10),
      sku: form.sku.trim() || null,
    }

    if (!lockStock) {
      payload.stock_on_hand = parseInt(form.stock_on_hand, 10)
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">{serverError}</div>
      )}
      {warning && <WarningBanner message={warning} />}

      <Input id="prod-name" label="Product name" placeholder="e.g. Maize Flour 2kg" value={form.name} onChange={set('name')} error={errors.name} />
      <Input id="prod-sku" label="SKU / Code (optional)" placeholder="e.g. MF-2KG" value={form.sku} onChange={set('sku')} />

      {categories.length > 0 && (
        <div className="form-group">
          <label htmlFor="prod-category" className="label">Category</label>
          <select id="prod-category" className="input-field" value={form.category_id} onChange={set('category_id')}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input id="prod-buying" label={`Buying price (${currency})`} type="number" placeholder="0" value={form.buying_price} onChange={set('buying_price')} error={errors.buying_price} />
        <Input id="prod-selling" label={`Selling price (${currency})`} type="number" placeholder="0" value={form.selling_price} onChange={set('selling_price')} error={errors.selling_price} />
      </div>
      <p className="text-muted text-xs -mt-2">Changing the buying price will not affect past sale records.</p>

      <div className="grid grid-cols-2 gap-4">
        {lockStock ? (
          <div className="form-group">
            <label className="label">Stock quantity</label>
            <div className="input-field bg-bg-gray text-muted cursor-not-allowed font-semibold py-2.5 select-none">
              {form.stock_on_hand} — use Restock to add stock
            </div>
          </div>
        ) : (
          <Input id="prod-stock" label="Stock quantity" type="number" placeholder="0" value={form.stock_on_hand} onChange={set('stock_on_hand')} error={errors.stock_on_hand} />
        )}
        <Input id="prod-threshold" label="Low stock alert at" type="number" placeholder="5" value={form.low_stock_level} onChange={set('low_stock_level')} error={errors.low_stock_level} />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        )}
        <Button type="submit" loading={loading} className="flex-1">{submitLabel}</Button>
      </div>

      {extraBottom}
    </form>
  )
}

// ─── Add Product Modal ────────────────────────────────────────────────────────
const AddProductModal = ({ categories, currency, businessId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [warning, setWarning] = useState('')

  const handleSubmit = async data => {
    setLoading(true)
    setServerError('')
    setWarning('')
    try {
      const res = await api.post('/products', { ...data, business_id: businessId })
      const warnings = res.data?.warnings || []
      if (warnings.includes('DUPLICATE_ITEM')) {
        setWarning('A product with a similar name already exists. It was saved anyway.')
      }
      onSaved(res.data)
      if (!warnings.includes('DUPLICATE_ITEM')) onClose()
    } catch (err) {
      setServerError(err.response?.data?.error?.message || err.response?.data?.detail || 'Could not save product.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-modal w-full max-w-md fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold text-navy">Add new product</h2>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <ProductForm
            categories={categories}
            currency={currency}
            loading={loading}
            serverError={serverError}
            warning={warning}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel="Add product"
            lockStock={false}
            extraBottom={
              warning ? (
                <Button type="button" onClick={onClose} variant="secondary" fullWidth>Done</Button>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  )
}

// ─── Edit Product Panel ───────────────────────────────────────────────────────
const EditProductPanel = ({ product: initialProduct, categories, currency, onClose, onSaved, onArchived }) => {
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const handleSubmit = async data => {
    setLoading(true)
    setServerError('')
    try {
      const res = await api.patch(`/products/${product.id}`, data)
      onSaved(res.data)
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.error?.message || err.response?.data?.detail || 'Could not update product.')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await api.post(`/products/${product.id}/archive`)
      onArchived(product.id)
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.error?.message || err.response?.data?.detail || 'Could not archive product.')
    } finally {
      setArchiving(false)
      setConfirmArchive(false)
    }
  }

  return (
    <SlidePanel title={`Edit — ${product.name}`} onClose={onClose} width="w-[480px]">
      <div className="px-6 py-5">
        <ProductForm
          initialValues={product}
          categories={categories}
          currency={currency}
          loading={loading}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save changes"
          lockStock={true}
          extraBottom={
            <div className="pt-4 border-t border-border mt-4">
              {!confirmArchive ? (
                <button
                  type="button"
                  onClick={() => setConfirmArchive(true)}
                  className="text-sm text-danger hover:underline font-medium"
                >
                  Archive product
                </button>
              ) : (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-danger font-medium">
                      Are you sure? This product will be hidden from your list.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmArchive(false)} className="flex-1">Keep it</Button>
                    <Button type="button" variant="danger" size="sm" loading={archiving} onClick={handleArchive} className="flex-1">Yes, archive</Button>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>
    </SlidePanel>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductsPage = () => {
  const { business } = useAuth()
  const currency = business?.currency || 'UGX'
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  
  const [restockProduct, setRestockProduct] = useState(null)
  const [historyProduct, setHistoryProduct] = useState(null)
  
  const [banner, setBanner] = useState('')
  const searchDebounce = useRef(null)

  const loadCategories = useCallback(async () => {
    if (!business?.id) return
    try {
      const res = await api.get('/product-categories', { params: { business_id: business.id } })
      const items = res.data?.items || res.data?.categories || (Array.isArray(res.data) ? res.data : [])
      setCategories(items)
    } catch {
      setCategories([])
    }
  }, [business?.id])

  const loadProducts = useCallback(async (q = '', catId = '') => {
    if (!business?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const params = { limit: 100, business_id: business.id }
      if (q) params.search = q
      if (catId) params.category_id = catId
      const res = await api.get('/products', { params })
      const items = res.data?.items || res.data?.products || (Array.isArray(res.data) ? res.data : [])
      setProducts(items)
    } catch (err) {
      console.error('Failed to load products:', err)
      setProducts([])
      setLoadError(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Could not load products. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [business?.id])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadProducts(search, filterCategory) }, [loadProducts, filterCategory])

  const handleSearch = e => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => loadProducts(q, filterCategory), 300)
  }

  const handleSaved = newProd => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === newProd.id)
      return idx >= 0 ? prev.map(p => p.id === newProd.id ? newProd : p) : [newProd, ...prev]
    })
    setBanner(`${newProd.name} saved.`)
  }

  const handleArchived = id => {
    setProducts(prev => prev.filter(p => p.id !== id))
    setBanner('Product archived.')
  }

  const handleRestockSaved = () => {
    loadProducts(search, filterCategory)
    setBanner('Product restocked successfully.')
  }

  const lowCount = products.filter(p => {
    const qty = p.stock_on_hand ?? 0
    return qty <= (p.low_stock_level ?? 5)
  }).length

  if (!business?.id) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <Package size={40} className="text-border mx-auto mb-3" />
          <p className="font-semibold text-navy">No active business selected</p>
          <p className="text-muted text-sm mt-1">
            You need a business set up before you can manage products.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {banner && <ConfirmationBanner message={banner} onDismiss={() => setBanner('')} />}

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-navy">Products</h1>
          <p className="text-muted mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''}
            {lowCount > 0 && <span className="ml-2 badge badge-warning">{lowCount} low stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button id="view-margins-btn" variant="secondary" onClick={() => navigate('/margins')} className="gap-2">
            <BarChart2 size={16} />
            View margins
          </Button>
          <Button id="add-product-btn" onClick={() => setShowModal(true)} className="gap-2">
            <Plus size={16} />
            Add product
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm">
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="product-search"
            type="text"
            placeholder="Search products…"
            className="input-field pl-10 py-2.5 text-sm w-full"
            value={search}
            onChange={handleSearch}
          />
        </div>
        {categories.length > 0 && (
          <select
            id="product-filter-category"
            className="input-field w-auto min-w-[160px] py-2.5 text-sm"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex gap-6">
        {/* ── Products table ── */}
        <div className="flex-1 card p-0 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-bg-gray border-b border-border">
            {['Product', 'Category', 'Stock', 'Buying price', 'Selling price'].map(h => (
              <p key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{h}</p>
            ))}
          </div>

          {loading ? (
            <div>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={5} />)}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package size={40} className="text-border mx-auto mb-3" />
              <p className="font-semibold text-navy">No products yet</p>
              <p className="text-muted text-sm mt-1">Add your first product to start tracking stock.</p>
            </div>
          ) : (
            <div>
              {products.map(product => {
                const { variant, label } = stockBadge(product)
                return (
                  <div key={product.id} className="relative group border-b border-border last:border-0 hover:bg-bg-gray transition-colors">
                    <button
                      onClick={() => setEditProduct(product)}
                      className={`w-full grid grid-cols-5 gap-4 px-6 py-4 text-left ${editProduct?.id === product.id ? 'bg-blue-50' : ''}`}
                    >
                      <div>
                        <p className="font-semibold text-navy text-sm">{product.name}</p>
                        {product.sku && <p className="text-muted text-xs mt-0.5">SKU: {product.sku}</p>}
                      </div>
                      <p className="text-sm text-muted self-center">
                        {product.category?.name || '—'}
                      </p>
                      <div className="self-center">
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                      <p className="text-sm text-muted self-center">
                        {product.buying_price != null ? fmt(product.buying_price, currency) : '—'}
                      </p>
                      <div className="flex items-center justify-between self-center">
                        <span className="text-sm font-semibold text-navy">
                          {fmt(product.selling_price, currency)}
                        </span>
                        <span className="w-16 h-4" />
                      </div>
                    </button>

                    {/* Actions trailing icons */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-gradient-to-l from-bg-gray via-bg-gray/90 to-transparent pl-4 py-1.5 rounded-l-lg z-10">
                      <button
                        onClick={e => { e.stopPropagation(); setRestockProduct(product) }}
                        title="Restock"
                        className="p-1.5 rounded-lg hover:bg-border/40 text-muted hover:text-primary transition-colors bg-surface border border-border"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setHistoryProduct(product) }}
                        title="Purchase history"
                        className="p-1.5 rounded-lg hover:bg-border/40 text-muted hover:text-primary transition-colors bg-surface border border-border"
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Edit panel ── */}
        {editProduct && (
          <EditProductPanel
            product={editProduct}
            categories={categories}
            currency={currency}
            onClose={() => setEditProduct(null)}
            onSaved={p => { handleSaved(p); setEditProduct(null) }}
            onArchived={id => { handleArchived(id); setEditProduct(null) }}
          />
        )}
      </div>

      {showModal && (
        <AddProductModal
          categories={categories}
          currency={currency}
          businessId={business?.id}
          onClose={() => setShowModal(false)}
          onSaved={p => { handleSaved(p); setShowModal(false) }}
        />
      )}

      {restockProduct && (
        <RestockModal
          product={restockProduct}
          currency={currency}
          onClose={() => setRestockProduct(null)}
          onSaved={handleRestockSaved}
        />
      )}

      {historyProduct && (
        <PurchaseHistoryModal
          productId={historyProduct.id}
          productName={historyProduct.name}
          currency={currency}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </AppShell>
  )
}

export default ProductsPage