import { useState } from 'react'
import { Package, Plus, Trash2, ShieldAlert, ArrowRight, Pencil, Check, X, FolderPlus } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

// ── Category select + inline "quick add" used by both the add-form and the edit row ──
const CategoryField = ({ id, categoryId, categories, onChange, onAddCategory }) => {
    const [adding, setAdding] = useState(false)
    const [draftName, setDraftName] = useState('')
    const [err, setErr] = useState('')

    const handleAdd = () => {
        const name = draftName.trim()
        if (!name) { setErr('Category name is required.'); return }
        if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            setErr('That category already exists.')
            return
        }
        const newCategory = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            name,
        }
        onAddCategory(newCategory)
        onChange(newCategory.id)
        setDraftName('')
        setErr('')
        setAdding(false)
    }

    if (adding) {
        return (
            <div className="form-group">
                <label className="label">New category</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        autoFocus
                        className="input-field text-sm"
                        placeholder="e.g. Beverages"
                        value={draftName}
                        onChange={e => { setDraftName(e.target.value); setErr('') }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="px-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0"
                        aria-label="Save category"
                    >
                        <Check size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAdding(false); setDraftName(''); setErr('') }}
                        className="px-3 rounded-lg border border-border text-muted hover:bg-bg-gray transition-colors flex-shrink-0"
                        aria-label="Cancel new category"
                    >
                        <X size={15} />
                    </button>
                </div>
                {err && <p className="error-msg mt-1">{err}</p>}
            </div>
        )
    }

    return (
        <div className="form-group">
            <label htmlFor={id} className="label">Category</label>
            <select
                id={id}
                className="input-field"
                value={categoryId || ''}
                onChange={e => {
                    if (e.target.value === '__add_new__') { setAdding(true); return }
                    onChange(e.target.value)
                }}
            >
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__add_new__">+ Add new category…</option>
            </select>
        </div>
    )
}

// ── Inline editor shown inside a list card when Edit is clicked ──────────────
const ItemEditRow = ({ item, currency, categories, onAddCategory, onSave, onCancel }) => {
    const [draft, setDraft] = useState({
        name: item.name,
        category_id: item.category_id || '',
        selling_price: String(item.selling_price),
        stock_qty: String(item.stock_qty),
        low_stock_level: String(item.low_stock_level),
    })
    const [errs, setErrs] = useState({})

    const set = field => e => setDraft(d => ({ ...d, [field]: e.target.value }))

    const validate = () => {
        const e = {}
        if (!draft.name.trim()) e.name = 'Name is required.'
        const price = parseFloat(draft.selling_price)
        if (draft.selling_price && (isNaN(price) || price < 0)) e.selling_price = 'Must be ≥ 0.'
        const stock = parseFloat(draft.stock_qty)
        if (draft.stock_qty && (isNaN(stock) || stock < 0)) e.stock_qty = 'Must be ≥ 0.'
        const low = parseFloat(draft.low_stock_level)
        if (draft.low_stock_level && (isNaN(low) || low < 0)) e.low_stock_level = 'Must be ≥ 0.'
        return e
    }

    const handleSave = () => {
        const e = validate()
        if (Object.keys(e).length) { setErrs(e); return }
        const category = categories.find(c => c.id === draft.category_id) || null
        onSave({
            ...item,
            name: draft.name.trim(),
            category_id: draft.category_id || null,
            category_name: category?.name || null,
            selling_price: parseFloat(draft.selling_price) || 0,
            stock_qty: parseFloat(draft.stock_qty) || 0,
            low_stock_level: parseFloat(draft.low_stock_level) || 5,
        })
    }

    return (
        <div className="p-3.5 bg-blue-50 border border-primary rounded-xl space-y-3">
            <Input
                id={`edit-name-${item.id}`}
                label="Product Name"
                value={draft.name}
                onChange={set('name')}
                error={errs.name}
            />
            <CategoryField
                id={`edit-category-${item.id}`}
                categoryId={draft.category_id}
                categories={categories}
                onChange={value => setDraft(d => ({ ...d, category_id: value }))}
                onAddCategory={onAddCategory}
            />
            <div className="grid grid-cols-3 gap-2">
                <Input
                    id={`edit-price-${item.id}`}
                    label={`Price (${currency})`}
                    type="number"
                    value={draft.selling_price}
                    onChange={set('selling_price')}
                    error={errs.selling_price}
                />
                <Input
                    id={`edit-stock-${item.id}`}
                    label="Available Stock"
                    type="number"
                    value={draft.stock_qty}
                    onChange={set('stock_qty')}
                    error={errs.stock_qty}
                />
                <Input
                    id={`edit-low-${item.id}`}
                    label="Low stock alert"
                    type="number"
                    value={draft.low_stock_level}
                    onChange={set('low_stock_level')}
                    error={errs.low_stock_level}
                />
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                    <Check size={14} /> Save
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-muted text-sm font-semibold hover:bg-bg-gray transition-colors"
                >
                    <X size={14} /> Cancel
                </button>
            </div>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
const Step5InventorySetup = ({ onBack, initialItems = [], initialCategories = [], currency = 'UGX', onSubmit, loading, error }) => {
    const [items, setItems] = useState(initialItems)
    const [categories, setCategories] = useState(initialCategories)
    const [editingId, setEditingId] = useState(null)  // id of the item currently being edited
    const [form, setForm] = useState({
        name: '',
        category_id: '',
        selling_price: '',
        stock_qty: '',
        low_stock_level: '5',
    })
    const [formErrors, setFormErrors] = useState({})

    const handleChange = field => e => {
        setForm(f => ({ ...f, [field]: e.target.value }))
    }

    const handleAddCategory = newCategory => {
        setCategories(prev => [...prev, newCategory])
    }

    const validateItem = () => {
        const errs = {}
        if (!form.name.trim()) {
            errs.name = 'Product name is required.'
        }
        const selling = parseFloat(form.selling_price)
        if (form.selling_price && (isNaN(selling) || selling < 0)) {
            errs.selling_price = 'Must be 0 or more.'
        }
        const stock = parseFloat(form.stock_qty)
        if (form.stock_qty && (isNaN(stock) || stock < 0)) {
            errs.stock_qty = 'Must be 0 or more.'
        }
        const lowStock = parseFloat(form.low_stock_level)
        if (form.low_stock_level && (isNaN(lowStock) || lowStock < 0)) {
            errs.low_stock_level = 'Must be 0 or more.'
        }
        return errs
    }

    const handleAddItem = (e) => {
        e.preventDefault()
        const errs = validateItem()
        if (Object.keys(errs).length > 0) {
            setFormErrors(errs)
            return
        }
        setFormErrors({})

        const category = categories.find(c => c.id === form.category_id) || null

        const newItem = {
            // Stable unique id — used to identify items across edits/deletes
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            name: form.name.trim(),
            category_id: form.category_id || null,
            category_name: category?.name || null,
            selling_price: parseFloat(form.selling_price) || 0,
            stock_qty: parseFloat(form.stock_qty) || 0,
            low_stock_level: parseFloat(form.low_stock_level) || 5,
        }

        setItems(prev => [...prev, newItem])
        setForm({
            name: '',
            category_id: form.category_id, // keep the last-used category selected for faster bulk entry
            selling_price: '',
            stock_qty: '',
            low_stock_level: '5',
        })
    }

    const handleRemoveItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id))
        if (editingId === id) setEditingId(null)
    }

    // Save an edited item by stable id (not index)
    const handleSaveEdit = (updatedItem) => {
        setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))
        setEditingId(null)
    }

    const handleFinish = () => {
        onSubmit(items, categories)
    }

    const handleSkip = () => {
        onSubmit([], [])
    }

    return (
        <div className="card shadow-modal max-w-xl">
            <div className="mb-7">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="text-primary" size={22} />
                </div>
                <h2 className="text-2xl font-bold text-navy">Add inventory items</h2>
                <p className="text-muted mt-2 leading-relaxed">
                    Create some startup items now to start testing. You can also skip this and add items later.
                </p>
            </div>

            {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-danger text-sm flex gap-3 items-start">
                    <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Setup Encountered Errors</p>
                        <p className="mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Add item form */}
            <form onSubmit={handleAddItem} className="space-y-4 p-4 bg-bg-gray rounded-2xl mb-6">
                <p className="font-semibold text-navy text-sm">New Product Details</p>

                <Input
                    id="item-name"
                    label="Product Name"
                    placeholder="e.g. Cooking oil 500ml"
                    value={form.name}
                    onChange={handleChange('name')}
                    error={formErrors.name}
                />

                <CategoryField
                    id="item-category"
                    categoryId={form.category_id}
                    categories={categories}
                    onChange={value => setForm(f => ({ ...f, category_id: value }))}
                    onAddCategory={handleAddCategory}
                />

                <div className="grid grid-cols-3 gap-3">
                    <Input
                        id="item-price"
                        label={`Price (${currency})`}
                        placeholder="0"
                        type="number"
                        value={form.selling_price}
                        onChange={handleChange('selling_price')}
                        error={formErrors.selling_price}
                    />
                    <Input
                        id="item-stock"
                        label="Starting Stock"
                        placeholder="0"
                        type="number"
                        value={form.stock_qty}
                        onChange={handleChange('stock_qty')}
                        error={formErrors.stock_qty}
                    />
                    <Input
                        id="item-low"
                        label="Low alert qty"
                        placeholder="5"
                        type="number"
                        value={form.low_stock_level}
                        onChange={handleChange('low_stock_level')}
                        error={formErrors.low_stock_level}
                    />
                </div>

                <Button type="submit" variant="secondary" className="w-full flex items-center justify-center gap-2 mt-2 py-2">
                    <Plus size={16} /> Add item to list
                </Button>
            </form>

            {/* Added items list */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-navy text-sm">Products to create ({items.length})</p>
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={() => { setItems([]); setEditingId(null) }}
                            className="text-muted hover:text-danger text-xs font-semibold"
                        >
                            Clear all
                        </button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-8 bg-surface border border-dashed border-border rounded-2xl">
                        <p className="text-xs text-muted">No items added yet. Click "Skip for now" if you want to skip.</p>
                    </div>
                ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {items.map((item) => (
                            <div key={item.id}>
                                {editingId === item.id ? (
                                    <ItemEditRow
                                        item={item}
                                        currency={currency}
                                        categories={categories}
                                        onAddCategory={handleAddCategory}
                                        onSave={handleSaveEdit}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl hover:border-primary transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-navy text-[14px] truncate">{item.name}</p>
                                                {item.category_name && (
                                                    <span className="badge badge-neutral flex-shrink-0 flex items-center gap-1 text-[11px]">
                                                        <FolderPlus size={10} /> {item.category_name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted mt-0.5">
                                                Price: <span className="font-semibold text-navy">{currency} {item.selling_price.toLocaleString()}</span> &bull; Stock: <span className="font-semibold text-navy">{item.stock_qty}</span> &bull; Low alert: <span className="font-semibold text-navy">{item.low_stock_level}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditingId(item.id)}
                                                className="p-2 text-muted hover:text-primary rounded-lg hover:bg-blue-50 transition-colors"
                                                aria-label="Edit product"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-2 text-muted hover:text-danger rounded-lg hover:bg-red-50 transition-colors"
                                                aria-label="Remove product"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Navigation Buttons */}
            <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={onBack} disabled={loading} className="flex-1">
                        Back
                    </Button>
                    <Button
                        type="button"
                        onClick={handleFinish}
                        loading={loading}
                        className="flex-1 gap-2"
                        size="lg"
                    >
                        Finish Setup
                        <ArrowRight size={16} />
                    </Button>
                </div>

                <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="w-full text-center py-2 text-sm text-primary font-semibold hover:underline"
                >
                    Skip for now, I'll add my products later
                </button>
            </div>
        </div>
    )
}

export default Step5InventorySetup
